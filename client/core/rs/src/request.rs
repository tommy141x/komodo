use anyhow::{anyhow, Context};
use reqwest::StatusCode;
use serde::{de::DeserializeOwned, Serialize};
use serde_json::json;
use serror::deserialize_error;

use crate::{
  api::{
    auth::KomodoAuthRequest, execute::KomodoExecuteRequest,
    read::KomodoReadRequest, user::KomodoUserRequest,
    write::KomodoWriteRequest,
  },
  KomodoClient,
};

impl KomodoClient {
  #[cfg(not(feature = "blocking"))]
  pub async fn auth<T: KomodoAuthRequest>(
    &self,
    request: T,
  ) -> anyhow::Result<T::Response> {
    self
      .post(
        "/auth",
        json!({
          "type": T::req_type(),
          "params": request
        }),
      )
      .await
  }

  #[cfg(feature = "blocking")]
  pub fn auth<T: KomodoAuthRequest>(
    &self,
    request: T,
  ) -> anyhow::Result<T::Response> {
    self.post(
      "/auth",
      json!({
        "type": T::req_type(),
        "params": request
      }),
    )
  }

  #[cfg(not(feature = "blocking"))]
  pub async fn user<T: KomodoUserRequest>(
    &self,
    request: T,
  ) -> anyhow::Result<T::Response> {
    self
      .post(
        "/auth",
        json!({
          "type": T::req_type(),
          "params": request
        }),
      )
      .await
  }

  #[cfg(feature = "blocking")]
  pub fn user<T: KomodoUserRequest>(
    &self,
    request: T,
  ) -> anyhow::Result<T::Response> {
    self.post(
      "/auth",
      json!({
        "type": T::req_type(),
        "params": request
      }),
    )
  }

  #[cfg(not(feature = "blocking"))]
  pub async fn read<T: KomodoReadRequest>(
    &self,
    request: T,
  ) -> anyhow::Result<T::Response> {
    self
      .post(
        "/read",
        json!({
          "type": T::req_type(),
          "params": request
        }),
      )
      .await
  }

  #[cfg(feature = "blocking")]
  pub fn read<T: KomodoReadRequest>(
    &self,
    request: T,
  ) -> anyhow::Result<T::Response> {
    self.post(
      "/read",
      json!({
        "type": T::req_type(),
        "params": request
      }),
    )
  }

  #[cfg(not(feature = "blocking"))]
  pub async fn write<T: KomodoWriteRequest>(
    &self,
    request: T,
  ) -> anyhow::Result<T::Response> {
    self
      .post(
        "/write",
        json!({
          "type": T::req_type(),
          "params": request
        }),
      )
      .await
  }

  #[cfg(feature = "blocking")]
  pub fn write<T: KomodoWriteRequest>(
    &self,
    request: T,
  ) -> anyhow::Result<T::Response> {
    self.post(
      "/write",
      json!({
        "type": T::req_type(),
        "params": request
      }),
    )
  }

  #[cfg(not(feature = "blocking"))]
  pub async fn execute<T: KomodoExecuteRequest>(
    &self,
    request: T,
  ) -> anyhow::Result<T::Response> {
    self
      .post(
        "/execute",
        json!({
          "type": T::req_type(),
          "params": request
        }),
      )
      .await
  }

  #[cfg(feature = "blocking")]
  pub fn execute<T: KomodoExecuteRequest>(
    &self,
    request: T,
  ) -> anyhow::Result<T::Response> {
    self.post(
      "/execute",
      json!({
        "type": T::req_type(),
        "params": request
      }),
    )
  }

  #[cfg(not(feature = "blocking"))]
  async fn post<
    B: Serialize + std::fmt::Debug,
    R: DeserializeOwned,
  >(
    &self,
    endpoint: &str,
    body: B,
  ) -> anyhow::Result<R> {
    let req = self
      .reqwest
      .post(format!("{}{endpoint}", self.address))
      .header("x-api-key", &self.key)
      .header("x-api-secret", &self.secret)
      .header("content-type", "application/json")
      .json(&body);
    let res =
      req.send().await.context("failed to reach Komodo API")?;
    let status = res.status();
    if status == StatusCode::OK {
      match res.json().await {
        Ok(res) => Ok(res),
        Err(e) => Err(anyhow!("{e:#?}").context(status)),
      }
    } else {
      match res.text().await {
        Ok(res) => Err(deserialize_error(res).context(status)),
        Err(e) => Err(anyhow!("{e:?}").context(status)),
      }
    }
  }

  #[cfg(feature = "blocking")]
  fn post<B: Serialize + std::fmt::Debug, R: DeserializeOwned>(
    &self,
    endpoint: &str,
    body: B,
  ) -> anyhow::Result<R> {
    let req = self
      .reqwest
      .post(format!("{}{endpoint}", self.address))
      .header("x-api-key", &self.key)
      .header("x-api-secret", &self.secret)
      .header("content-type", "application/json")
      .json(&body);
    let res = req.send().context("failed to reach Komodo API")?;
    let status = res.status();
    if status == StatusCode::OK {
      match res.json() {
        Ok(res) => Ok(res),
        Err(e) => Err(anyhow!("{e:#?}").context(status)),
      }
    } else {
      match res.text() {
        Ok(res) => Err(deserialize_error(res).context(status)),
        Err(e) => Err(anyhow!("{e:?}").context(status)),
      }
    }
  }
}
