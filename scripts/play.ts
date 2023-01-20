import "@johnlindquist/kit";

let envOptions = {
  hint: md(
    `You need to [create an app](https://developer.spotify.com/dashboard/applications) to client_id and client_secret`,
  ),
  ignoreBlur: true,
  secret: true,
};

let client_id = await env("SPOTIFY_CLIENT_ID", envOptions);
let client_secret = await env("SPOTIFY_CLIENT_SECRET", envOptions);

var token = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
    Authorization:
      "Basic " + new Buffer(client_id + ":" + client_secret).toString("base64"),
  },

  body: "grant_type=client_credentials",
}).then((res) => res.json());

async function GetAlbums(artistName: string) {
  //   dev(token);
  let response = await fetch(
    `https://api.spotify.com/v1/search?type=album&include_external=audio&q=${artistName}`,
    {
      headers: {
        Authorization: "Bearer " + token.access_token,
        "Content-type": "application/json",
      },
    },
  );
  return (await response.json()).albums.items;
}

let albums = await GetAlbums("Oscar Peterson Trio");

const spotifyUri = await div(
  //   `<div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-10  p-5 justify-center items-center mx-auto">
  `<div class="grid grid-cols-6 gap-4">
      ${albums.map(
        (album: any) =>
          `<a target="_blank" href="submit:${album.uri}" className="flex flex-col gap-10 p-5 justify-center items-center mx-auto shadow-sm hover:shadow-2xl transition-shadow duration-500 ease-in-out">
          <img class="w-32" src=${album.images[0].url} alt="album" />
          <h3>${album.name}</h3>
          <p>${album.artists[0].name}</p>
        </a>`,
      )}
    </div>	
`,
);

await open(spotifyUri);
