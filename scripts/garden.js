// Name: garden

import "@johnlindquist/kit";

// let matter = await npm("gray-matter");
let { globby } = await npm("globby");

// function getTitle(file) {
//   let { data } = matter(file);
//   return data.title;
// }

const projectFolder =
  "Users/dillonkearns/src/github.com/dillonkearns/incrementalelm.com/content";

const candidates = await globby(`${projectFolder}/**/*.md`);

// let notePath = await arg("Select", (input) =>
//   candidates
//     .filter((file) => file.toLowerCase().includes(input.toLowerCase()))
//     .map((file) => path.basename(file))
// );

let notePath = await arg(
  "Select",
  candidates.map((file) => {
    return { value: file, name: path.basename(file) };
  })
);

if (path.dirname(notePath) !== projectFolder) {
  notePath = path.join(projectFolder, `${notePath}.md`);
}
// TODO if path is not under project dir, then prepend it, and use new file template

await edit(notePath);
