const config = require('./config.json');
const telnyx = require("telnyx")(config.API_KEY)
const moment = require('moment');
const express = require('express');
const expressNunjucks = require('express-nunjucks');
const crypto = require("crypto");

const app = express();
app.use(express.urlencoded());
app.set('views', `${__dirname}/templates`);

expressNunjucks(app, {
        watch: true,
        noCache: true,
});

const port = 3000

class TokenStorage{

    static add_token(token, phone_number){
        this.tokens[token] = {
            'phone_number': phone_number,
            'last_updated': Date.now(),
            'token': token.toUpperCase()
        }
    }

    static token_is_valid(token){
        return token in TokenStorage.tokens
    }

    static clear_token(token){
        delete TokenStorage.tokens.token
    }
}

TokenStorage.tokens = {}

app.get('/', (_req, res) => {
    res.render('index');
});

app.post('/request', (req, res) => {
    let phone_number = req.body.phone
                        .replace('-','').replace('.','')
                        .replace('(','').replace(')','')
                        .replace(' ','')
    let generated_token = get_random_token_hex(config.TOKEN_LENGTH)
    TokenStorage.add_token(generated_token, phone_number)

    telnyx.messages.create({
     "to": `${phone_number}`,
     "from": `${config.COUNTRY_CODE}${config.FROM_NUMBER}`,
     "text": `Your Token is ${generated_token}`
    })

    res.render('verify.html');
})

app.post("/verify", (req, res) => {
    let token = req.body.token
    if (TokenStorage.token_is_valid(token)){
        TokenStorage.clear_token(token)
        res.render('verify_success.html')
    }else{
        res.render('verify.html')
    }
})

function get_random_token_hex(num_chars) {
    let bytes = crypto.randomBytes(num_chars).toString('hex');
    return bytes
}


app.listen(port, () => console.log(`App listening on ${port}!`))
