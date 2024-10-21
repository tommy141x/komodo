import { Page } from "@components/layouts";
import { ResourceLink } from "@components/resources/common";
import { DockerResourceLink, StatusBadge } from "@components/util";
import { container_state_intention } from "@lib/color";
import { useRead } from "@lib/hooks";
import { DataTable, SortableHeader } from "@ui/data-table";
import { Input } from "@ui/input";
import { Box, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export const ContainersPage = () => {
  const [search, setSearch] = useState("");
  const searchSplit = search.toLowerCase().split(" ");
  const servers = useRead("ListServers", {}).data;
  const serverName = useCallback(
    (id: string) => servers?.find((server) => server.id === id)?.name,
    [servers]
  );
  const _containers = useRead("ListAllDockerContainers", {}).data;
  const containers = useMemo(
    () =>
      _containers?.filter((c) => {
        if (searchSplit.length === 0) return true;
        return searchSplit.every((search) => c.name.includes(search));
      }),
    [_containers, searchSplit]
  );
  return (
    <Page
      title="Containers"
      subtitle={
        <div className="text-muted-foreground">
          See all containers across all servers
        </div>
      }
      icon={<Box className="w-8 h-8" />}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div></div>
          <div className="relative">
            <Search className="w-4 absolute top-[50%] left-3 -translate-y-[50%] text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search..."
              className="pl-8 w-[200px] lg:w-[300px]"
            />
          </div>
        </div>
        <DataTable
          data={containers ?? []}
          tableKey="containers-page-v1"
          columns={[
            {
              accessorKey: "name",
              header: ({ column }) => (
                <SortableHeader column={column} title="Name" />
              ),
              cell: ({ row }) => (
                <DockerResourceLink
                  type="container"
                  server_id={row.original.server_id!}
                  name={row.original.name}
                />
              ),
              size: 200,
            },
            {
              accessorKey: "server_id",
              sortingFn: (a, b) => {
                const sa = serverName(a.original.server_id!);
                const sb = serverName(b.original.server_id!);

                if (!sa && !sb) return 0;
                if (!sa) return -1;
                if (!sb) return 1;

                if (sa > sb) return 1;
                else if (sa < sb) return -1;
                else return 0;
              },
              header: ({ column }) => (
                <SortableHeader column={column} title="Server" />
              ),
              cell: ({ row }) => (
                <ResourceLink type="Server" id={row.original.server_id!} />
              ),
            },
            {
              accessorKey: "image",
              header: ({ column }) => (
                <SortableHeader column={column} title="Image" />
              ),
              cell: ({ row }) => (
                <DockerResourceLink
                  type="image"
                  server_id={row.original.server_id!}
                  name={row.original.image}
                  id={row.original.image_id}
                />
              ),
            },
            {
              accessorKey: "network_mode",
              header: ({ column }) => (
                <SortableHeader column={column} title="Network" />
              ),
              cell: ({ row }) => (
                <DockerResourceLink
                  type="network"
                  server_id={row.original.server_id!}
                  name={row.original.network_mode}
                />
              ),
            },
            {
              accessorKey: "state",
              header: ({ column }) => (
                <SortableHeader column={column} title="State" />
              ),
              cell: ({ row }) => {
                const state = row.original?.state;
                return (
                  <StatusBadge
                    text={state}
                    intent={container_state_intention(state)}
                  />
                );
              },
            },
          ]}
        />
      </div>
    </Page>
  );
};