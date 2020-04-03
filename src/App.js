import React, { Component } from "react";
//import image01 from "./black-turntable-1653090.jpg";
import "./App.css";

class App extends Component {
  constructor(props) {
    super(props);
    // set the initial state
    this.state = {
      token: "",
      deviceId: "",
      loggedIn: false,
      error: "",
      spotifyId: "",
      albumArt: "",
      trackName: "Track Name",
      artistName: "Artist Name",
      albumName: "Album Name",
      playing: false,
      position: 0,
      duration: 1,
      tracks: [],
      recommendedTracks: [],
      current_track: ""
    };
    // this will later be set by setInterval
    this.playerCheckInterval = null;
  }

  // when we click the "go" button
  handleLogin() {
    if (this.state.token !== "") {
      // change the loggedIn variable, then start checking for the window.Spotify variable
      this.setState({ loggedIn: true });
      this.playerCheckInterval = setInterval(() => this.checkForPlayer(), 1000);
    }
  }

  // when we receive a new update from the player
  onStateChanged(state) {
    // only update if we got a real state
    if (state !== null) {
      const {
        current_track: currentTrack,
        position,
        duration
      } = state.track_window;
      const trackName = currentTrack.name;
      const albumName = currentTrack.album.name;
      const artistName = currentTrack.artists
        .map(artist => artist.name)
        .join(", ");
      const playing = !state.paused;
      const albumArt = currentTrack.album.images[0].url;
      const spotifyId = currentTrack.id;
      const current_track = currentTrack;
      this.setState({
        position,
        duration,
        trackName,
        albumName,
        artistName,
        albumArt,
        spotifyId,
        playing,
        current_track
      });
    } else {
      // state was null, user might have swapped to another device
      this.setState({
        error: "Looks like you might have swapped to another device?"
      });
    }
    this.getRecommendations();
  }

  createEventHandlers() {
    // problem setting up the player
    this.player.on("initialization_error", e => {
      console.error(e);
    });
    // problem authenticating the user.
    // either the token was invalid in the first place,
    // or it expired (it lasts one hour)
    this.player.on("authentication_error", e => {
      console.error(e);
      this.setState({ loggedIn: false });
    });
    // currently only premium accounts can use the API
    this.player.on("account_error", e => {
      console.error(e);
    });
    // loading/playing the track failed for some reason
    this.player.on("playback_error", e => {
      console.error(e);
    });

    // Playback status updates
    this.player.on("player_state_changed", state => this.onStateChanged(state));

    // Ready
    this.player.on("ready", async data => {
      let { device_id } = data;
      console.log("Let the music play on!");
      // set the deviceId variable, then let's try
      // to swap music playback to *our* player!
      await this.setState({ deviceId: device_id });
      this.transferPlaybackHere();
      this.transferPlaylist();
    });
  }

  checkForPlayer() {
    const { token } = this.state;

    // if the Spotify SDK has loaded
    if (window.Spotify !== null) {
      // cancel the interval
      clearInterval(this.playerCheckInterval);
      // create a new player
      this.player = new window.Spotify.Player({
        name: "Acoustics",
        getOAuthToken: cb => {
          cb(token);
        }
      });
      // set up the player's event handlers
      this.createEventHandlers();

      // finally, connect!
      this.player.connect();
    }
  }

  onPrevClick() {
    this.player.previousTrack();
  }

  onPlayClick() {
    this.player.togglePlay();
  }

  onNextClick() {
    this.player.nextTrack();
  }

  transferPlaybackHere() {
    const { deviceId, token } = this.state;
    // https://beta.developer.spotify.com/documentation/web-api/reference/player/transfer-a-users-playback/
    fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        // true: start playing music if it was paused on the other device
        // false: paused if paused on other device, start playing music otherwise
        play: true
      })
    });
  }

  transferPlaylist() {
    const { token } = this.state;
    fetch("https://api.spotify.com/v1/me/playlists", {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })
      .then(response => response.json())

      .then(data =>
        this.setState({
          tracks: data.items
        })
      );
  }

  getRecommendations() {
    const { token, current_track } = this.state;

    fetch("https://api.spotify.com/v1/recommendations", {
      method: "GET",
      headers: {
        seed_tracks: current_track.id,
        seed_artists: current_track.artists[0].uri.split(":")[2],
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })
      .then(response => response.json())

      .then(data =>
        this.setState({
          recommendedTracks: data.tracks
        })
      );
    console.log(this.state.recommendedTracks);
  }
  render() {
    const {
      token,
      loggedIn,
      trackName,
      artistName,
      albumName,
      error,
      albumArt,
      spotifyId,
      playing,
      tracks,
      recommendedTracks,
      current_track
    } = this.state;

    return (
      <div className="App">
        <h1>Acoustics</h1>

        {error && <p>Error: {error}</p>}

        {loggedIn ? (
          <div>
            <p>
              {albumArt == "" ? (
                <p></p>
              ) : (
                <img src={albumArt} style={{ height: 200 }} />
              )}
            </p>

            <p>Artist: {artistName}</p>
            <p>Track: {trackName}</p>
            <p>Album: {albumName}</p>
            <button class="flat-button" onClick={() => this.onPrevClick()}>
              Previous
            </button>
            <button class="flat-button" onClick={() => this.onPlayClick()}>
              {playing ? "Pause" : "Play"}
            </button>
            <button class="flat-button" onClick={() => this.onNextClick()}>
              Next
            </button>
          </div>
        ) : (
          <div>
            <p className="p6">
              Enter your Spotify access token.{" "}
              <div className="container">
                <a
                  href="https://beta.developer.spotify.com/documentation/web-playback-sdk/quick-start/#authenticating-with-spotify"
                  target="_blank"
                >
                  Access Token
                </a>
              </div>
            </p>
            <div className="form-group">
              <input
                type="text"
                value={token}
                onChange={e => this.setState({ token: e.target.value })}
                placeholder="Paste Token"
              />
            </div>
            <p>
              <button className="Go" onClick={() => this.handleLogin()}>
                Go
              </button>
            </p>
          </div>
        )}
      </div>
    );
  }
}

export default App;
