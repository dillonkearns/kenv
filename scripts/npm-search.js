import "@johnlindquist/kit"
    
// Menu: npm
// Description: Search npm
// Author: Ian Sutherland
// Twitter: @iansu

await arg("Search query:", async () => {
  let query = await arg("Search query:")

  exec(`open https://www.npmjs.com/search?q=${query}`)
})