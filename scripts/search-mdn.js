import "@johnlindquist/kit"
    
// Shortcode:
// Menu: Search MDN
// Description: Search and open MDN docs
// Author: John Lindquist
// Twitter: @johnlindquist

let searchIndexResponse = await get(
  `https://developer.mozilla.org/en-US/search-index.json`
)

let url = await arg(
  `Select doc:`,
  searchIndexResponse.data.map(({ title, url }) => ({
    name: title,
    description: url,
    value: `https://developer.mozilla.org${url}`,
  }))
)

exec(`open '${url}'`)
