# Two factor authentication with Telnyx

⏱ **20 minutes build time || Difficulty Level: Intermediate || [Github Repo](https://github.com/team-telnyx/demo-two-factor-auth-node)**


## Configuration

Create a `config.json` file in your project directory. Express will load this at startup. First, use [this](https://developers.telnyx.com/docs/v2/messaging/quickstarts/portal-setup) guide to provision an SMS number and messaging profile, and create an API key. Then add those to the config file.

```json
{
    "API_KEY": "YOUR_API_KEY",
    "FROM_NUMBER": "YOUR_TELNYX_NUMBER"
}
```

> **Note:** *This file contains a secret key, it should not be committed to source control.*

We’ll also place Node in debug mode, assume all numbers are in the U.S., and specify the number of characters we'd like the OTP token to be.

```json
{
    "NODE_ENV": "development",
    "COUNTRY_CODE": "+1",
    "TOKEN_LENGTH": 4 
}
```


## Token Storage

We'll use a class to store tokens in memory for the purposes of this example. In a production environment, a traditional database would be appropriate. Create a class called `TokenStorage` with three methods. This class will store uppercase tokens as keys, with details about those tokens as values, and expose check and delete methods.

```javascript
class TokenStorage{

    static add_token(token, phone_number){
        this.tokens[token] = {
            'phone_number':phone_number,
            'last_updated':Date.now(),
            'token':token.toUpperCase()
        }
    }

    static token_is_valid(token){
        return token in TokenStorage.tokens 
    }

    static clear_token(token){
        delete TokenStorage.tokens[token]
    }
}

TokenStorage.tokens = {}
```


## Server initialization

Setup a simple Express app that watches the templates directory with `Nunjucks`, load the config file, and configure the telnyx library.

```javascript
const config = require('./config.json';)
const express = require("express")
const app = express()

app.use(express.urlencoded());
app.set('views', `${__dirname}/templates`);

expressNunjucks(app, {
    watch: true,
    noCache: true,
});

```

## Collect User Input

Create a simple HTML form, index.html, which collects the phone number for validation. The full HTML source can be found at our Github repo, and we'll serve the root

```javascript
app.get('/', (_req, res) => {
    res.render('index');
}); 
```

## Token generation

We'll start with a simple method, `get_random_token_hex`, that generates a random string of hex characters to be used as OTP tokens.

```javascript
function get_random_token_hex(num_chars) {
    return crypto.randomBytes(num_chars).toString('hex');
}
```

The `randomBytes` method accepts a number of bytes, so we need to divide by two and and round up in order to ensure we get enough characters (two characters per byte),and then finally trim by the actual desired length. This allows us to support odd numbered token lengths.

Next, handle the form on the `/request` route. First this method normalizes the phone number.

```javascript
app.post('/request', (req, res) => {
    let phone_number = req.body.phone
                        .replace('-','').replace('.','')
                        .replace('(','').replace(')','')
                        .replace(' ','')
```

Then generate a token and add the token/phone number pair to the data store.

```javascript
    let generated_token = get_random_token_h(config.TOKEN_LENGTH)
    TokenStorage.add_token(generated_token, phone_number)
```

Finally, send an SMS to the device and serve the verification page.

```javascript
    telnyx.messages.create({
        "to":   `${phone_number}`,
        "from": `${config.COUNTRY_CODE}${config.FROM_NUMBER}`,
        "text": `Your Token is ${generated_token}`
    })

    res.render('verify.html');
})
```


## Token verification

The `verify.html` file includes a form that collects the token and sends it back to the server. If the token is valid, we'll clear it from the datastore and serve the success page.

```javascript
app.post("/verify", (req, res) => {
    let token = req.body.token
    if (TokenStorage.token_is_valid(token)) {
        TokenStorage.clear_token(token)
        res.render('verify_success.html')

```

Otherwise, send the user back to the verify form with an error message

```javascript
    } else {
        res.render('verify.html')
    }
})
```


## Finishing up

At the end of the file, run the server.

```javascript
const port = 3000
app.listen(port, () => console.log(`App listening on ${port}!`))
```

To start the application, run `node index.js`.
