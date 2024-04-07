use std::{str::FromStr, time::Duration};

use anyhow::{anyhow, Context};
use monitor_client::entities::{
  deployment::{Deployment, DockerContainerState},
  monitor_timestamp,
  permission::{Permission, PermissionLevel},
  server::{Server, ServerStatus},
  tag::Tag,
  update::{ResourceTarget, Update, UpdateListItem},
  user::{admin_service_user, User},
  Operation,
};
use mungos::{
  by_id::{find_one_by_id, update_one_by_id},
  mongodb::bson::{doc, oid::ObjectId, to_document},
};
use periphery_client::{api, PeripheryClient};
use rand::{thread_rng, Rng};

use crate::{config::core_config, db::db_client};

use self::{channel::update_channel, resource::StateResource};

pub mod alert;
pub mod cache;
pub mod channel;
pub mod procedure;
pub mod resource;

pub fn empty_or_only_spaces(word: &str) -> bool {
  if word.is_empty() {
    return true;
  }
  for char in word.chars() {
    if char != ' ' {
      return false;
    }
  }
  true
}

pub fn random_duration(min_ms: u64, max_ms: u64) -> Duration {
  Duration::from_millis(thread_rng().gen_range(min_ms..max_ms))
}

pub fn make_update(
  target: impl Into<ResourceTarget>,
  operation: Operation,
  user: &User,
) -> Update {
  Update {
    start_ts: monitor_timestamp(),
    target: target.into(),
    operation,
    operator: user.id.clone(),
    success: true,
    ..Default::default()
  }
}

pub async fn get_user(user_id: &str) -> anyhow::Result<User> {
  if let Some(user) = admin_service_user(user_id) {
    return Ok(user);
  }
  find_one_by_id(&db_client().await.users, user_id)
    .await
    .context("failed to query mongo for user")?
    .with_context(|| format!("no user found with id {user_id}"))
}

pub async fn get_server_with_status(
  server_id_or_name: &str,
) -> anyhow::Result<(Server, ServerStatus)> {
  let server = Server::get_resource(server_id_or_name).await?;
  if !server.config.enabled {
    return Ok((server, ServerStatus::Disabled));
  }
  let status =
    match periphery_client(&server)?.request(api::GetHealth {}).await
    {
      Ok(_) => ServerStatus::Ok,
      Err(_) => ServerStatus::NotOk,
    };
  Ok((server, status))
}

pub async fn get_deployment_state(
  deployment: &Deployment,
) -> anyhow::Result<DockerContainerState> {
  if deployment.config.server_id.is_empty() {
    return Ok(DockerContainerState::NotDeployed);
  }
  let (server, status) =
    get_server_with_status(&deployment.config.server_id).await?;
  if status != ServerStatus::Ok {
    return Ok(DockerContainerState::Unknown);
  }
  let container = periphery_client(&server)?
    .request(api::container::GetContainerList {})
    .await?
    .into_iter()
    .find(|container| container.name == deployment.name);

  let state = match container {
    Some(container) => container.state,
    None => DockerContainerState::NotDeployed,
  };

  Ok(state)
}

// TAG

pub async fn get_tag(id_or_name: &str) -> anyhow::Result<Tag> {
  let query = match ObjectId::from_str(id_or_name) {
    Ok(id) => doc! { "_id": id },
    Err(_) => doc! { "name": id_or_name },
  };
  db_client()
    .await
    .tags
    .find_one(query, None)
    .await
    .context("failed to query mongo for tag")?
    .with_context(|| format!("no tag found matching {id_or_name}"))
}

pub async fn get_tag_check_owner(
  id_or_name: &str,
  user: &User,
) -> anyhow::Result<Tag> {
  let tag = get_tag(id_or_name).await?;
  if user.admin || tag.owner == user.id {
    return Ok(tag);
  }
  Err(anyhow!("user must be tag owner or admin"))
}

// UPDATE

async fn update_list_item(
  update: Update,
) -> anyhow::Result<UpdateListItem> {
  let username = if User::is_service_user(&update.operator) {
    update.operator.clone()
  } else {
    find_one_by_id(&db_client().await.users, &update.operator)
      .await
      .context("failed to query mongo for user")?
      .with_context(|| {
        format!("no user found with id {}", update.operator)
      })?
      .username
  };
  let update = UpdateListItem {
    id: update.id,
    operation: update.operation,
    start_ts: update.start_ts,
    success: update.success,
    operator: update.operator,
    target: update.target,
    status: update.status,
    version: update.version,
    username,
  };
  Ok(update)
}

async fn send_update(update: UpdateListItem) -> anyhow::Result<()> {
  update_channel().sender.lock().await.send(update)?;
  Ok(())
}

pub async fn add_update(
  mut update: Update,
) -> anyhow::Result<String> {
  update.id = db_client()
    .await
    .updates
    .insert_one(&update, None)
    .await
    .context("failed to insert update into db")?
    .inserted_id
    .as_object_id()
    .context("inserted_id is not object id")?
    .to_string();
  let id = update.id.clone();
  let update = update_list_item(update).await?;
  let _ = send_update(update).await;
  Ok(id)
}

pub async fn update_update(update: Update) -> anyhow::Result<()> {
  update_one_by_id(&db_client().await.updates, &update.id, mungos::update::Update::Set(to_document(&update)?), None)
      .await
      .context("failed to update the update on db. the update build process was deleted")?;
  let update = update_list_item(update).await?;
  let _ = send_update(update).await;
  Ok(())
}

pub async fn remove_from_recently_viewed(
  resource: impl Into<ResourceTarget>,
) -> anyhow::Result<()> {
  let resource: ResourceTarget = resource.into();
  let (ty, id) = resource.extract_variant_id();
  db_client()
    .await
    .users
    .update_many(
      doc! {},
      doc! {
        "$pull": {
          "recently_viewed": {
            "type": ty.to_string(),
            "id": id,
          }
        }
      },
      None,
    )
    .await
    .context(
      "failed to remove resource from users recently viewed",
    )?;
  Ok(())
}

//

pub fn periphery_client(
  server: &Server,
) -> anyhow::Result<PeripheryClient> {
  if !server.config.enabled {
    return Err(anyhow!("server not enabled"));
  }

  let client = PeripheryClient::new(
    &server.config.address,
    &core_config().passkey,
  );

  Ok(client)
}

pub async fn create_permission(
  user: &User,
  target: impl Into<ResourceTarget>,
  level: PermissionLevel,
) {
  // No need to actually create permissions for admins
  if user.admin {
    return;
  }
  let target: ResourceTarget = target.into();
  if let Err(e) = db_client()
    .await
    .permissions
    .insert_one(
      Permission {
        id: Default::default(),
        user_id: user.id.clone(),
        target: target.clone(),
        level,
      },
      None,
    )
    .await
  {
    warn!("failed to create permission for {target:?} | {e:#}");
  };
}
