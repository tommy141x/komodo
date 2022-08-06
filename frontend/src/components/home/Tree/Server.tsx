import { Component, createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { useAppState } from "../../../state/StateProvider";
import { useTheme } from "../../../state/ThemeProvider";
import { useUser } from "../../../state/UserProvider";
import { combineClasses } from "../../../util/helpers";
import { useLocalStorageToggle } from "../../../util/hooks";
import Button from "../../util/Button";
import Icon from "../../util/Icon";
import Flex from "../../util/layout/Flex";
import Grid from "../../util/layout/Grid";
import Deployment from "./Deployment";
import s from "../home.module.scss";
import { NewDeployment } from "./New";
import { getServerSystemStats } from "../../../util/query";
import Loading from "../../util/loading/Loading";
import { SystemStats } from "@monitor/types";

const Server: Component<{ id: string }> = (p) => {
  const { servers, deployments, selected } = useAppState();
  const [open, toggleOpen] = useLocalStorageToggle(p.id + "-homeopen");
  const { permissions, username } = useUser();
  const server = () => servers.get(p.id);
  const deploymentIDs = createMemo(() => {
    return (
      deployments.loaded() &&
      deployments.ids()!.filter((id) => deployments.get(id)?.serverID === p.id)
    );
  });
  const { themeClass } = useTheme();
  const [stats, setStats] = createSignal<SystemStats>();
  const [reloading, setReloading] = createSignal(false);
  const reloadStats = async () => {
    setReloading(true);
    await getServerSystemStats(p.id).then(setStats);
    setReloading(false);
  };
  reloadStats();
  return (
    <Show when={server()}>
      <div class={combineClasses(s.Server, "shadow", themeClass())}>
        <Button
          class={combineClasses(
            s.ServerButton,
            selected.id() === p.id && "selected",
            "shadow"
          )}
          onClick={toggleOpen}
        >
          <Flex>
            <Icon type="chevron-down" width="1rem" />
            <h1 style={{ "font-size": "1.25rem" }}>{server()?.name}</h1>
          </Flex>
          <Flex alignItems="center">
            <Show when={server()?.status === "OK"}>
              <Show when={stats()} fallback={<Loading type="three-dot" />}>
                <div>
                  <div style={{ opacity: 0.7 }}>cpu:</div> {stats()?.cpu.toFixed(1)}%
                </div>
                <div>
                  <div style={{ opacity: 0.7 }}>mem:</div>{" "}
                  {stats()?.mem.usedMemPercentage.toFixed(1)}%
                </div>
                <div>
                  <div style={{ opacity: 0.7 }}>disk:</div>{" "}
                  {stats()?.disk.usedPercentage.toFixed(1)}%
                </div>
                <Show when={!reloading()} fallback={<button class="blue"><Loading type="spinner" scale={0.2}/></button>}>
                  <button
                    class="blue"
                    onClick={(e) => {
                      e.stopPropagation();
                      reloadStats();
                    }}
                  >
                    <Icon type="refresh" width="0.75rem" />
                  </button>
                </Show>
              </Show>
            </Show>
            <div
              class={server()?.status === "OK" ? "green" : "red"}
              style={{
                padding: "0.25rem",
                "border-radius": ".35rem",
                transition: "background-color 125ms ease-in-out",
              }}
              onClick={(e) => {
                e.stopPropagation();
                selected.set(p.id, "server");
              }}
            >
              {server()?.status === "OK" ? "OK" : "NOT OK"}
            </div>
          </Flex>
        </Button>
        <Show when={open()}>
          <Grid
            gap=".5rem"
            class={combineClasses(
              s.Deployments,
              open() ? s.Enter : s.Exit,
              themeClass()
            )}
          >
            <For each={deploymentIDs()}>{(id) => <Deployment id={id} />}</For>
            <Show
              when={
                permissions() > 1 ||
                (permissions() > 0 && server()!.owners.includes(username()!))
              }
            >
              <NewDeployment serverID={p.id} />
            </Show>
          </Grid>
        </Show>
      </div>
    </Show>
  );
};

export default Server;