import { Build, User } from "@monitor/types";
import { clone } from "@monitor/util";
import { FastifyInstance } from "fastify";
import { CLONE_REPO } from ".";
import { addBuildUpdate } from "../../util/updates";

async function cloneRepo(
  app: FastifyInstance,
  user: User,
  { imageName, branch, repo, accessToken, _id }: Build
) {
  const { command, log, isError } = await clone(
    repo!,
    imageName!,
    branch,
    accessToken
  );
  addBuildUpdate(
    app,
    _id!,
    CLONE_REPO,
    command,
    log,
    user.username,
    "",
    !isError
  );
}

export default cloneRepo;
