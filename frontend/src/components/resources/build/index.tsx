import { Section } from "@components/layouts";
import { ConfirmButton } from "@components/util";
import { useExecute, useRead } from "@lib/hooks";
import { RequiredResourceComponents } from "@types";
import {
  AlertTriangle,
  Ban,
  FolderGit,
  Hammer,
  History,
  Loader2,
  Rocket,
} from "lucide-react";
import { useToast } from "@ui/use-toast";
import { BuildConfig } from "./config";
import { fill_color_class_by_intention } from "@lib/color";
import { BuildChart } from "./dashboard";
import { BuildTable } from "./table";
import {
  CopyResource,
  DeleteResource,
  NewResource,
  ResourceLink,
} from "../common";
import { DeploymentTable } from "../deployment/table";

const useBuild = (id?: string) =>
  useRead("ListBuilds", {}).data?.find((d) => d.id === id);

const Icon = ({ id }: { id: string }) => {
  const building = useRead("GetBuildActionState", { build: id }).data?.building;
  const className = building
    ? "w-4 h-4 animate-spin " + fill_color_class_by_intention("Good")
    : "w-4 h-4";
  return <Hammer className={className} />;
};

export const BuildComponents: RequiredResourceComponents = {
  Table: BuildTable,
  Dashboard: BuildChart,
  Name: ({ id }) => <>{useBuild(id)?.name}</>,
  Link: ({ id }) => <ResourceLink type="Build" id={id} />,
  Info: [
    ({ id }) => {
      const repo = useBuild(id)?.info.repo;
      return (
        <div className="flex items-center gap-2">
          <FolderGit className="w-4 h-4" />
          {repo}
        </div>
      );
    },
    ({ id }) => {
      const ts = useBuild(id)?.info.last_built_at;
      return (
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" />
          {ts ? new Date(ts).toLocaleString() : "Never Built"}
        </div>
      );
    },
  ],
  Status: () => <>Build</>,
  Page: {
    Deployments: ({ id }) => {
      const deployments = useRead("ListDeployments", {}).data?.filter(
        (deployment) => deployment.info.build_id === id
      );
      return (
        <Section title="Deployments" icon={<Rocket className="w-4 h-4" />}>
          <DeploymentTable deployments={deployments} />
        </Section>
      );
    },
    Config: ({ id }) => <BuildConfig id={id} />,
    Danger: ({ id }) => (
      <Section
        title="Danger Zone"
        icon={<AlertTriangle className="w-4 h-4" />}
        actions={<CopyResource type="Build" id={id} />}
      >
        <DeleteResource type="Build" id={id} />
      </Section>
    ),
  },
  Icon: ({ id }) => {
    if (id) return <Icon id={id} />;
    else return <Hammer className="w-4 h-4" />;
  },
  Actions: [
    ({ id }) => {
      const { toast } = useToast();
      const building = useRead("GetBuildActionState", { build: id }).data
        ?.building;
      const { mutate: run_mutate, isPending: runPending } = useExecute(
        "RunBuild",
        {
          onMutate: () => {
            toast({ title: "Run Build Sent" });
          },
        }
      );
      const { mutate: cancel_mutate, isPending: cancelPending } = useExecute(
        "CancelBuild",
        {
          onMutate: () => {
            toast({ title: "Cancel Build Sent" });
          },
          onSuccess: () => {
            toast({ title: "Build Cancelled" });
          },
        }
      );
      if (building) {
        return (
          <ConfirmButton
            title="Cancel Build"
            variant="destructive"
            icon={<Ban className="h-4 w-4" />}
            onClick={() => cancel_mutate({ build: id })}
            disabled={cancelPending}
          />
        );
      } else {
        return (
          <ConfirmButton
            title="Build"
            icon={
              runPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Hammer className="h-4 w-4" />
              )
            }
            onClick={() => run_mutate({ build: id })}
            disabled={runPending}
          />
        );
      }
    },
  ],
  New: () => <NewResource type="Build" />,
};
