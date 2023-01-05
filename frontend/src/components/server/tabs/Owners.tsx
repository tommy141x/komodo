import { useParams } from "@solidjs/router";
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";
import { client } from "../../..";
import { useAppState } from "../../../state/StateProvider";
import { useUser } from "../../../state/UserProvider";
import {
  Operation,
  PermissionLevel,
  PermissionsTarget,
  User,
} from "../../../types";
import { combineClasses, getId } from "../../../util/helpers";
import ConfirmButton from "../../shared/ConfirmButton";
import Input from "../../shared/Input";
import Flex from "../../shared/layout/Flex";
import Grid from "../../shared/layout/Grid";
import Menu from "../../shared/menu/Menu";
import Selector from "../../shared/menu/Selector";
import { useConfig } from "./config/Provider";

const PERMISSIONS_OPTIONS = [
  PermissionLevel.Read,
  PermissionLevel.Execute,
  PermissionLevel.Update,
];

const Owners: Component<{}> = (p) => {
  const { ws } = useAppState();
  const { server } = useConfig();
  const { user } = useUser();
  const params = useParams();
  const [userSearch, setUserSearch] = createSignal("");
  const [users, setUsers] = createSignal<User[]>([]);
  createEffect(() => {
    client.list_users().then(setUsers);
  });
  const getUser = (user_id: string) =>
    users().find((u) => getId(u) === user_id)!;
  const searchUsers = createMemo(() =>
    users().filter(
      (u) =>
        !u.admin &&
        u.enabled &&
        u.username.includes(userSearch()) &&
        (server.permissions![getId(u)] === undefined ||
          server.permissions![getId(u)] === PermissionLevel.None)
    )
  );
  let unsub = () => {};
  createEffect(() => {
    unsub();
    unsub = ws.subscribe(
      [Operation.ModifyUserPermissions, Operation.ModifyUserEnabled],
      () => {
        client.list_users().then(setUsers);
      }
    );
  });
  onCleanup(() => unsub());
  return (
    <Show when={server.loaded}>
      <Grid class="config">
        <Grid class="config-items scroller" style={{ height: "100%" }}>
          <Grid class={combineClasses("config-item shadow")} gap="0.5rem">
            <Menu
              show={userSearch() ? true : false}
              close={() => setUserSearch("")}
              target={
                <Input
                  placeholder="add user"
                  value={userSearch()}
                  onEdit={setUserSearch}
                  style={{ width: "12rem" }}
                />
              }
              content={
                <>
                  <For each={searchUsers()}>
                    {(user) => (
                      <ConfirmButton
                        color="grey"
                        style={{
                          width: "100%",
                          "justify-content": "flex-start",
                        }}
                        onConfirm={() => {
                          client.update_user_permissions_on_target({
                            user_id: getId(user),
                            permission: PermissionLevel.Read,
                            target_type: PermissionsTarget.Server,
                            target_id: params.id,
                          });
                          setUserSearch("");
                        }}
                        confirm="add user"
                      >
                        {user.username}
                      </ConfirmButton>
                    )}
                  </For>
                  <Show when={users().length === 0}>no matching users</Show>
                </>
              }
              menuStyle={{ width: "12rem" }}
            />
            <For each={Object.keys(server.permissions!)}>
              {(user_id) => {
                const u = () => getUser(user_id);
                const permissions = () => server.permissions![user_id];
                return (
                  <Flex
                    alignItems="center"
                    justifyContent="space-between"
                    class={combineClasses("grey-no-hover")}
                    style={{
                      padding: "0.5rem",
                    }}
                  >
                    <div class="big-text">
                      {u().username}
                      {user_id === getId(user()) && " ( you )"}
                    </div>
                    <Flex alignItems="center">
                      <Selector
                        selected={permissions()}
                        items={PERMISSIONS_OPTIONS}
                        onSelect={(permission) => {
                          client.update_user_permissions_on_target({
                            user_id,
                            permission: permission as PermissionLevel,
                            target_type: PermissionsTarget.Server,
                            target_id: params.id,
                          });
                        }}
                        position="bottom right"
                      />
                      <ConfirmButton
                        color="red"
                        onConfirm={() => {
                          client.update_user_permissions_on_target({
                            user_id,
                            permission: PermissionLevel.None,
                            target_type: PermissionsTarget.Server,
                            target_id: params.id,
                          });
                        }}
                      >
                        remove
                      </ConfirmButton>
                    </Flex>
                  </Flex>
                );
              }}
            </For>
          </Grid>
        </Grid>
      </Grid>
    </Show>
  );
};

export default Owners;
