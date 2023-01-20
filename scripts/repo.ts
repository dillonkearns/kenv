// Name: repo
// Reference: https://github.com/johnlindquist/kit/discussions/124
// Shortcut: cmd shift .

import "@johnlindquist/kit";

async function getProjects(parentDir) {
  return ls(parentDir).map((dir) => {
    const fullPath = path.join(parentDir, dir);
    return {
      name: dir,
      value: fullPath,
      description: fullPath,
    };
  });
}

const choice = await arg(
  "Which project?",
  await getProjects("~/src/github.com/dillonkearns/"),
);

exec(`code ${choice}`);
kit.iterm(`cd ${choice}`);
