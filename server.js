import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';
import crypto from "node:crypto";
import config from "./config.js";
import {decrypt} from "dotenv";

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
    const [results] = await connection.query(`SELECT MAX(transactionID) from transactions`);
    return results[0]["MAX(transactionID)"]
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
    if(user.access===1){
        return true;
    }
    else{
        const [results] = await connection.query(`SELECT ownerID from accounts where accountID = ${accountID}`);
        if(results[0].ownerID === user.id){
            return true;
        }
    }
    return false;
}

async function verifyBalance(amount,accountID){
    const[results] = await connection.query(`SELECT balance FROM accounts where accountID = ${accountID}`);
    if(results[0].balance >= amount){
        return true;
    }
    return false;
}

async function transfer(user, fromID, toID, amount){
    let accessFrom = await verifyAccess(user, fromID);
    let accessTo = await verifyAccess(user, toID);
    if(accessFrom === false || accessTo === false){
        return "no access";
    }
    let fromBalance = await verifyBalance(amount, fromID);
    if(fromBalance===false){
        return "insufficient balance";
    }
    //create transaction
    let transactionID = await getLargestTransaction()+1;
    connection.query(`Insert into transactions values('${transactionID}', ${amount}, '${fromID}', '${toID}')`);
    //update acc
    const[fromBal] = await connection.query(`SELECT balance from accounts where accountID = ${fromID}`)
    const[toBal] = await connection.query(`SELECT balance from accounts where accountID = ${toID}`)
    connection.query(`UPDATE accounts SET balance= ${fromBal[0].balance - amount}  WHERE accountID = ${fromID}`);
    connection.query(`UPDATE accounts SET balance= ${toBal[0].balance + amount}  WHERE accountID = ${toID}`);
    return "success";

}

async function deposit(user, accountID, amount){
    if(user.access === 1){
        //create transaction
        let transactionID = await getLargestTransaction()+1;
        connection.query(`Insert into transactions values('${transactionID}', ${amount}, null, '${accountID}')`);
        //update acc
        const[toBal] = await connection.query(`SELECT balance from accounts where accountID = ${accountID}`)
        connection.query(`UPDATE accounts SET balance= ${toBal[0].balance + amount}  WHERE accountID = ${accountID}`);
        return "success";
    }
    else{
        return "no access"
    }
}

async function withdraw(user, accountID, amount){
    if(user.access === 1){
        let fromBalance = await verifyBalance(amount, accountID);
        if(fromBalance===false){
            return "insufficient balance";
        }
        //create transaction
        let transactionID = await getLargestTransaction()+1;
        connection.query(`Insert into transactions values('${transactionID}', ${amount}, '${accountID}', null)`);
        //update acc
        const[fromBal] = await connection.query(`SELECT balance from accounts where accountID = ${accountID}`)
        connection.query(`UPDATE accounts SET balance= ${fromBal[0].balance - amount}  WHERE accountID = ${accountID}`);
        return "success";
    }
    else{
        return "no access"
    }
}
// verifyBalance(21, 31).then((results=>{
//     console.log(results);
// }))

// getUser('Anya').then((results)=>{
//   // console.log(results);
//   // getAccounts(results).then((results)=>{
//   //     console.log(results);
//   // })
//   //   verifyAccess(results,'21').then((results)=>{
//   //       console.log(results);
//   //   })
//   //   transfer(results, 41, 42, 5).then((results)=>{
//   //       console.log(results);
//   //   })
//   //   deposit(results,11,40).then((results)=>{
//   //       console.log(results);
//   //   })
//   //   withdraw(results,31,40).then((results)=>{
//   //       console.log(results);
//   //   })
// })

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



app.get('/public_key', (req, res) => {
    res.json(publicKey)
})

app.get("/accounts", (req,res)=>{
    const{encryptedUsername, encryptedPassword} = req.query;

    if(!encryptedUsername || !encryptedPassword){
        return res.status(400).json({error: 'invalid login'});
    }
    const decryptUsername = decryptData(urlSafeToBase64(encryptedUsername));
    const decryptPassword = decryptData(urlSafeToBase64(encryptedUsername));

    getUser(decryptUsername).then((account)=>{
        verifyPassword(decryptPassword, account.salt, account.hash, ()=>{
            console.log('Accounts:', getAccounts(account));
            res.status(200).json(getAccounts(account));
        },
            ()=>{
            console.log("invalid password");
            res.status(400).json('invalid password');
        })

    })
})


app.get("/transactions", (req,res)=>{
    const{encryptedUsername, encryptedPassword, id} = req.query;

    if(!encryptedUsername || !encryptedPassword|| !id){
        return res.status(400).json({error: 'invalid login'});
    }
    const decryptUsername = decryptData(urlSafeToBase64(encryptedUsername));
    const decryptPassword = decryptData(urlSafeToBase64(encryptedUsername));
    const decryptID= decryptData(urlSafeToBase64(id));
    getUser(decryptUsername).then((account)=>{
        verifyPassword(decryptPassword, account.salt, account.hash, ()=>{
            console.log('Transactions:', getTransactions(decryptID));
            res.status(200).json(getTransactions(decryptID));
        }
            ,()=>{
            console.log("invalid password");
            res.status(400).json('invalid password');
        })
    })
})


app.post("/login", (req,res)=>{
    const{encryptedUsername, encryptedPassword} = req.body;
    if(!encryptedUsername || !encryptedPassword){
        return res.status(400).json({error: 'invalid login'});
    }
    const decryptUsername = decryptData(urlSafeToBase64(encryptedUsername));
    const decryptPassword = decryptData(urlSafeToBase64(encryptedUsername));
    getUser(decryptUsername,decryptPassword).then((account)=>{
       createUser().then(result=>{
           console.log(result);
           res.status(201).json("login created");
       })
    })

})


app.post("/account", (req,res)=>{
    const{encryptedUsername, encryptedPassword,accountType} = req.body;

    if(!encryptedUsername || !encryptedPassword){
        return res.status(400).json({error: 'invalid login'});
    }
    const decryptUsername = decryptData(urlSafeToBase64(encryptedUsername));
    const decryptPassword = decryptData(urlSafeToBase64(encryptedUsername));
    getUser(decryptUsername).then((account)=>{
        verifyPassword(decryptPassword, account.salt, account.hash, ()=>{
            console.log('Creating account');
            createAccount(account, accountType).then(r => {
                console.log(r);
                res.status(201).json("account created");
            })

        },
            ()=>{
            res.status(400).json('invalid account');
            })
    })
    res.status(401).json("user not found")

})


app.post("/deposit",(req,res)=>{
    const{encryptedUsername, encryptedPassword, accountID,amount} = req.body;
    if(!encryptedUsername || !encryptedPassword){
        return res.status(400).json({error: 'invalid login'});
    }
    const decryptUsername = decryptData(urlSafeToBase64(encryptedUsername));
    const decryptPassword = decryptData(urlSafeToBase64(encryptedUsername));
    getUser(decryptUsername).then((account)=>{
        verifyPassword(decryptPassword,account.salt, account.hash, ()=>{
                deposit(decryptUsername, accountID, amount).then(r =>{
                    console.log(r);
                    res.status(200).json("withdrawal successful");
                })
            },
            res.status(400).json("deposit unsuccessful"))
    })
    res.status(401).json("user not found")
})


app.post("/withdraw",(req,res)=>{
    const{encryptedUsername, encryptedPassword, accountID,amount} = req.body;
    if(!encryptedUsername || !encryptedPassword){
        return res.status(400).json({error: 'invalid login'});
    }
    const decryptUsername = decryptData(urlSafeToBase64(encryptedUsername));
    const decryptPassword = decryptData(urlSafeToBase64(encryptedUsername));
    getUser(decryptUsername).then((account)=>{
        verifyPassword(decryptPassword,account.salt, account.hash, ()=>{
          withdraw(decryptUsername, accountID, amount).then(r =>{
              console.log(r);
              res.status(200).json("withdrawal successful");
          })
        },
            res.status(400).json("withdrawal unsuccessful"))
    })
    res.status(401).json("user not found")
})


app.post("/transfer",(req,res)=>{
    const{encryptedUsername, encryptedPassword, accountID,amount} = req.body;
    if(!encryptedUsername || !encryptedPassword){
        return res.status(400).json({error: 'invalid login'});
    }
    const decryptUsername = decryptData(urlSafeToBase64(encryptedUsername));
    const decryptPassword = decryptData(urlSafeToBase64(encryptedUsername));
    getUser(decryptUsername).then((account)=>{
        verifyPassword(decryptPassword, account.salt, account.hash, ()=>{

        })
    })

})

app.listen(port, ()=>{
    console.log(`Listening on port ${port}`);
})