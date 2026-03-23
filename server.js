import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';
import crypto from "node:crypto";
import config from "./config.js";

const connection = await mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.pass,
    port: config.db.port,
    database: config.db.db
});
const app = express();
app.use(cors({
    methods: ['GET', 'POST'] // Specify allowed methods
}));
app.use(bodyParser.json());
const port = config.port;
//return the user exists
//false if it doesn't


async function getUser(username){
    const[result] = await connection.query(`SELECT * FROM logins where username = "${username}"`)
    if(result.length >0){
        return result[0];
    }
    else{
        return false;
    }
}

async function getAccounts(username){
    if(username.access === 0){
        const[result] = await connection.query(`SELECT * FROM accounts where ownerID = ${username.id}`)
        return result;
    }
    else{
        const[result] = await connection.query(`SELECT * FROM accounts`)
        return result;
    }
}

async function getTransactions(accountID){
    const[result] = await connection.query(`SELECT * FROM transactions where fromAcc = ${accountID} OR toAcc = ${accountID}`)
    return result;
}

async function getLargestLogin(){
    const [results] = await connection.query(`SELECT MAX(id) from logins`);
    return results[0]["MAX(id)"]
}

async function getLargestAccount(){
    const [results] = await connection.query(`SELECT MAX(accountID) from accounts`);
    return results[0]["MAX(accountID)"]
}

async function getLargestTransaction(){
    const [results] = await connection.query(`SELECT MAX(accountID) from transactions`);
    return results[0]["MAX(accountID)"]
}

async function createUser(user, password) {
    const salt = crypto.randomBytes(16).toString('hex');
    let id = await getLargestLogin()+1;
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) throw err;

        const hash = derivedKey.toString('hex');

        //handle user creation here\
        connection.query(`Insert into logins values('${user}',${id}, '${hash}','${salt}',0)`);

    })

}

async function createAccount(user,accountType) {
    let accountID = await getLargestAccount()+1;
    connection.query(`Insert into accounts values('${accountID}', 0, '${accountType}', '${user.id}')`);
}

//boolean
async function verifyAccess(user,accountID){
    // if(user.access===1){
    //     return true;
    // }
    // else{
    //     const [results] = await connection.query(`SELECT ownerID from accounts where accountID = ${accountID}`);
    //     if(results[0]===user.id){
    //         return true;
    //     }
    // }
    const[results] = await connection.query(`SELECT * FROM accounts where accountID = ${accountID}`);
    let id = results.accountID;

    const[accounts] = await connection.query(`SELECT accounts.ownerID from accoun`)
}

getUser('Maya').then((results)=>{
  console.log(results);
  getAccounts(results).then((results)=>{
      console.log(results);
  })
    verifyAccess(results,'31').then((results)=>{
        console.log(results);
    })
})

// createUser('Mouse', 'Cheese').then(()=>{
//     console.log('Creating user');
// })

// getUser('Mouse').then((results)=>{
//     createAccount(results, 'savings').then(()=>{
//         console.log('Creating account')
//     })
// })



getTransactions(11).then((results)=>{
    console.log(results);
})
function verifyPassword(inputPassword, storedSalt, storedHash, actionOnSuccess, actionOnFail) {
    crypto.scrypt(inputPassword, storedSalt, 64, (err, derivedKey) => {
        if (err) throw err;

        const inputHash = derivedKey.toString('hex');

        // Compare the newly generated hash with the one stored in the database
        if(storedHash === inputHash) {
            actionOnSuccess();
        } else
            actionOnFail();
    });
}

const generateKeys = () => {
    const keys = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048, // Recommended key size for security
        publicKeyEncoding: {
            type: 'spki', // Recommended for public keys
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8', // Recommended for private keys
            format: 'pem',
        },
    });
    console.log('Private Key:', keys.privateKey);
    console.log('Public Key:', keys.publicKey);
    return keys;
}
let {publicKey, privateKey} = generateKeys();

const decryptData = (base64Data) => {
    // 1. Convert from encoded string to a buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // 2. Explicitly define padding and hash to match the Web Crypto API
    return crypto.privateDecrypt(
        {
            key: privateKey, // Your 2048-bit key from generateKeys()
            oaepHash: "sha256", // MUST BE THIS to match client's "SHA-256"
        },
        buffer
    ).toString("utf8");
};

const urlSafeToBase64 = (urlSafeStr) => {
    // Add padding back for standard Base64 if needed
    let standardB64 = urlSafeStr.replace(/-/g, '+').replace(/_/g, '/');
    while (standardB64.length % 4) {
        standardB64 += '=';
    }
    return standardB64;
};




app.get("/accounts", (req,res)=>{
    const{encryptedUsername, encryptedPassword} = req.body;

})


app.get("transactions", (req,res)=>{

})


app.post("/login", (req,res)=>{

})


app.post("/account", (req,res)=>{

})


app.post("/deposit",(req,res)=>{

})


app.post("/withdraw",(req,res)=>{

})


app.post("/transfer",(req,res)=>{

})

app.listen(port, ()=>{
    console.log(`Listening on port ${port}`);
})