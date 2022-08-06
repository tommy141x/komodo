import { BuildActionState, DeployActionState } from "@monitor/types";
import {
  Component,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import {
  BUILD,
  DELETE_CONTAINER,
  DELETE_DEPLOYMENT,
  DEPLOY,
  PULL_DEPLOYMENT,
  RECLONE_DEPLOYMENT_REPO,
  START_CONTAINER,
  STOP_CONTAINER,
} from "@monitor/util";
import { useAppState } from "../../state/StateProvider";
import {
  getBuildActionState,
  getDeploymentActionState,
} from "../../util/query";

type State = DeployActionState & Partial<BuildActionState>;

const context = createContext<State>();

export const ActionStateProvider: Component<{ exiting?: boolean }> = (p) => {
  const { selected, deployments, builds, ws } = useAppState();
  const [actions, setActions] = createStore<
    DeployActionState & Partial<BuildActionState>
  >({
    deploying: false,
    deleting: false,
    starting: false,
    stopping: false,
    fullDeleting: false,
    updating: false,
    pulling: false,
    recloning: false,
    building: false,
  });
  const deployment = () => deployments.get(selected.id())!
  createEffect(() => {
    getDeploymentActionState(selected.id()).then(setActions);
    const buildID = deployment().buildID;
    if (buildID && builds.get(buildID)) {
      getBuildActionState(buildID).then((state) => {
        setActions("building", state.building);
      });
    }
  });
  onCleanup(
    ws.subscribe([DEPLOY], ({ complete, deploymentID }) => {
      if (deploymentID === selected.id()) {
        setActions("deploying", !complete);
      }
    })
  );
  onCleanup(
    ws.subscribe([DELETE_CONTAINER], ({ complete, deploymentID }) => {
      if (deploymentID === selected.id()) {
        setActions("deleting", !complete);
      }
    })
  );
  onCleanup(
    ws.subscribe([START_CONTAINER], ({ complete, deploymentID }) => {
      if (deploymentID === selected.id()) {
        setActions("starting", !complete);
      }
    })
  );
  onCleanup(
    ws.subscribe([STOP_CONTAINER], ({ complete, deploymentID }) => {
      if (deploymentID === selected.id()) {
        setActions("stopping", !complete);
      }
    })
  );
  onCleanup(
    ws.subscribe([DELETE_DEPLOYMENT], ({ complete, deploymentID }) => {
      if (deploymentID === selected.id()) {
        setActions("fullDeleting", !complete);
      }
    })
  );
  onCleanup(
    ws.subscribe([PULL_DEPLOYMENT], ({ complete, deploymentID }) => {
      if (deploymentID === selected.id()) {
        setActions("pulling", !complete);
      }
    })
  );
  onCleanup(
    ws.subscribe([RECLONE_DEPLOYMENT_REPO], ({ complete, deploymentID }) => {
      if (deploymentID === selected.id()) {
        setActions("recloning", !complete);
      }
    })
  );
  onCleanup(ws.subscribe([BUILD], ({ complete, buildID }) => {
    if (deployment().buildID === buildID) {
      setActions("building", !complete);
    }
  }));
  return <context.Provider value={actions}>{p.children}</context.Provider>;
};

export function useActionStates() {
  return useContext(context) as State;
}
