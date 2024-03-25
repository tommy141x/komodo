import { useRead } from "@lib/hooks";
import { Button } from "@ui/button";
import {
  Bell,
  ExternalLink,
  User,
  Calendar,
  Check,
  X,
  Loader2,
  Milestone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Types } from "@monitor/client";
import { Section } from "@components/layouts";
import { fmt_date, fmt_version } from "@lib/utils";
import { UpdateDetails, UpdateUser } from "./details";
import { UpdateStatus } from "@monitor/client/dist/types";

// const UpdatePlaceHolder = () => (
//   <Card>
//     <CardHeader>
//       <CardTitle>...</CardTitle>
//       <CardContent>
//         <CardDescription className="flex items-center gap-2">
//           <User className="w-4 h-4" /> ...
//         </CardDescription>
//         <CardDescription className="flex items-center gap-2">
//           <Calendar className="w-4 h-4" /> ...
//         </CardDescription>
//       </CardContent>
//     </CardHeader>
//   </Card>
// );

const UpdateCard = ({ update }: { update: Types.UpdateListItem }) => {
  const Icon = () => {
    if (update.status === UpdateStatus.Complete) {
      if (update.success) return <Check className="w-4 stroke-green-500" />;
      else return <X className="w-4 stroke-red-500" />;
    } else return <Loader2 className="w-4 animate-spin" />;
  };

  return (
    <UpdateDetails id={update.id}>
      <div className="p-4 border rounded-md flex justify-between cursor-pointer hover:bg-accent transition-colors text-sm">
        <div>
          <div className="flex items-center gap-2">
            <Icon />
            {update.operation}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Milestone className="w-4" />
            {fmt_version(update.version)}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4" />
            {fmt_date(new Date(update.start_ts))}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4" />
            <UpdateUser user_id={update.operator} />
          </div>
        </div>
      </div>
      {/* <Card>
        <CardHeader className="items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Icon />
              {update.operation}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Milestone className="w-4" />
              {fmt_version(update.version)}
            </CardDescription>
          </div>
          <div>
            <CardDescription className="flex items-center gap-2">
              <User className="w-4" />
              <UpdateUser user_id={update.operator} />
            </CardDescription>
            <CardDescription className="flex items-center gap-2">
              <Milestone className="w-4" />
              {fmt_version(update.version)}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent />
      </Card> */}
      {/* <Card className="cursor-pointer hover:translate-y-[-2.5%] hover:bg-accent/50 transition-all">
        <CardHeader className="justify-between">
          <div>
            <CardTitle>{update.operation}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Milestone className="w-4 h-4" />
              {fmt_version(update.version)}
            </CardDescription>
          </div>
          <Icon />
        </CardHeader>
        <CardContent>
          <CardDescription className="flex items-center gap-2">
            <User className="w-4 h-4" />{" "}
            <UpdateUser user_id={update.operator} />
          </CardDescription>
          <CardDescription className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {fmt_update_date(new Date(update.start_ts))}
          </CardDescription>
        </CardContent>
      </Card> */}
    </UpdateDetails>
  );
};

export const ResourceUpdates = ({ type, id }: Types.ResourceTarget) => {
  const { data } = useRead("ListUpdates", {
    query: {
      "target.type": type,
      "target.id": id,
    },
  });

  return (
    <Section
      title="Updates"
      icon={<Bell className="w-4 h-4" />}
      actions={
        <Link to={`/${type.toLowerCase()}s/${id}/updates`}>
          <Button variant="secondary">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </Link>
      }
    >
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* {isLoading && <UpdatePlaceHolder />} */}
        {data?.updates.slice(0, 3).map((update) => (
          <UpdateCard update={update} key={update.id} />
        ))}
      </div>
    </Section>
  );
};
