const express = require('express')
const querystring = require('querystring');
const axios = require('axios');
const session = require('express-session');
const path = require('path'); // Add this line


const app = express()

//app.use(express.static('spotifyUtil'));
app.use(express.static(__dirname));


app.secret_key = "fh4ehfhf4bhihocyd7vbyguw63";

app.use(session({
    secret: app.secret_key,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
  }));


const client_id = "4fbf329bded8469f80b844244a4c5ef3"
const client_secret = "ac484ba1268041d1a2e81420831fa4c7"
const redirect_uri = "http://localhost:3000/callback"

const auth_url = "https://accounts.spotify.com/authorize"
const token_url = "https://accounts.spotify.com/api/token"
const api_base_url = "https://api.spotify.com/v1/"

const stateKey = 'spotify_auth_state';
const scope = "user-read-private user-read-email";
//const state = state;


// const generateRandomString = (length) => {
//     return crypto
//     .randomBytes(60)
//     .toString('hex')
//     .slice(0, length);
//   }

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req,res) =>{
    
    const params = {
        client_id: client_id,
        response_type: "code",
        scope: scope,
        redirect_uri: redirect_uri,
        show_dialog: true,
    }
   // var state = generateRandomString(16)
    // res.cookie(stateKey, state);

    const queryString = querystring.stringify(params);
    const authUrlWithParams = `${auth_url}?${queryString}`;

    res.redirect(authUrlWithParams);
})

app.get('/callback', async (req, res) => {
    if('error' in req.query){
        res.json({"Error": req.query.error})
    }
    if("code" in req.query){
        var req_body = {
            "code": req.query.code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
            "client_id": client_id,
            "client_secret": client_secret
        }
    }

    const response = await axios.post(token_url, querystring.stringify(req_body), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    const token_info = response.data;

    req.session.access_token = token_info.access_token;
    req.session.refresh_token = token_info.refresh_token;
    req.session.expires_at = Math.floor(Date.now() / 1000) + token_info.expires_in;
    
    res.redirect("/playlists")

});

app.get("/playlists", async (req,res) => {
    if(!req.session.access_token){
        return res.redirect("/login");
    }

    if(Math.floor(Date.now() / 1000) > req.session.expires_at){
        return res.redirect("/refresh-token")
    }

    const headers = {
        "Authorization": `Bearer ${req.session.access_token}`
    }
        const response = await axios.get(`${api_base_url}me/playlists`, { headers });
        res.json(response.data);
})

app.get("/refresh-token", async (req,res) => {
    if(!req.session.refresh_token){
        return res.redirect("/login")
    }
    if(Math.floor(Date.now() / 1000) > req.session.expires_at){
        var req_body = {
            "grant_type": "refresh_token",
            "refresh_token": req.session.refresh_token,
            "client_id": client_id,
            "client_secret": client_secret
        }
    }

    const response = await axios.post(token_url, querystring.stringify(req_body), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    const new_token_info = response.data;

    req.session.access_token = new_token_info.access_token
    req.session.expires_at = Math.floor(Date.now() / 1000) + new_token_info.expires_in;

    res.redirect("/playlists")
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});