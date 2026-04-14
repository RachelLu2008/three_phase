// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import heroImg from './assets/hero.png'
import './App.css'
import {arrayBufferToBase64, importPublicKey} from "./encryptionConverters.ts";
import {useEffect, useState} from "react";

function App() {

  const[page, setPage] = useState("home");
  const [key, setKey] = useState<CryptoKey>();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const[display,setDisplay] = useState('');


  const[accounts, setAccounts] = useState<{accountID: number, balance: number, accountType: string, ownerId: number}[]>([]);
  const[type, setType] =  useState('');
  const[transactions, setTransactions] = useState<{transactionID: number, amount: number, fromAcc: number, toAcc:number}[]>([]);

  const[ToAccount, setToAccount] =  useState('');
  const[fromAccount, setFromAccount] =  useState('');
  const[amount, setAmount] =  useState('');


  const refreshKey = () => {
    fetch(`http://localhost:3000/public_key`)
        .then(res => res.json())
        .then(public_key => {
          importPublicKey(public_key).then(cryptKey => {
            setKey(cryptKey)
          });

        });
  }
  useEffect(() => {
    refreshKey();
  }, []);


  async function encrypt(dataToEncode: string) {
    if(!key){
      return;
    }

    const data = new TextEncoder().encode(dataToEncode)

    const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        key,
        data
    );
    console.log("BUFFER", encrypted);

    const stringed = arrayBufferToBase64(encrypted);
    console.log("STRING", stringed);
    return stringed;

  }
  const base64ToUrlSafe = (base64Str: string): string => {
    return base64Str
        .replace(/\+/g, '-') // Replace + with -
        .replace(/\//g, '_') // Replace / with _
        .replace(/=+$/, ''); // Remove trailing = padding
  };

  async function create(){
    setDisplay("Creating User...")
    const encryptedUsername = await encrypt(user);
    const encryptedPassword = await encrypt(pass);
    console.log("USER", encryptedUsername);
    console.log("PASS", encryptedPassword);

    fetch(`http://localhost:3000/login`, {
      method: 'POST',
      headers: {
        "content-Type": 'application/json',
      },
      body: JSON.stringify({encryptedUsername, encryptedPassword}),

    })
        .then((res) => {
          if(!res.ok) {
            console.error(res, res.status, res.json().then(message=> {return message }))
            setDisplay("Failed to create user");

          } else {
            setDisplay("Successfully created user");
          }
        })

  }

  async function signIn(){
    setDisplay("Checking User...");
    const encryptedUserName = await encrypt(user);
    const encryptedPassword = await encrypt(pass);
    if(!encryptedUserName || !encryptedPassword) {
      setDisplay("User not found");
    }
    else{
      fetch(`http://localhost:3000/accounts?encryptedUsername=${base64ToUrlSafe(encryptedUserName)}&encryptedPassword=${base64ToUrlSafe(encryptedPassword)}`, {

      })   .then((res) => {
        if (!res.ok) {
          console.error(res, res.status, res.json().then(message => {
            return message
          }))
          setDisplay("Sign in not found");
        } else {
          res.json().then(accounts => {
            setAccounts(accounts)
            setPage("dashboard");
          });
        }
      })

    }

  }
async function setSelectedAccount(accounts: {accountID: number, balance: number, accountType: string, ownerId: number}){
  const encryptedUserName = await encrypt(user);
  const encryptedPassword = await encrypt(pass);
  if(!encryptedUserName || !encryptedPassword) {
    // setDisplay("User not found");
  }
  else{
    fetch(`http://localhost:3000/transactions?id=${accounts.accountID}&encryptedUsername=${base64ToUrlSafe(encryptedUserName)}&encryptedPassword=${base64ToUrlSafe(encryptedPassword)}`, {

    })   .then((res) => {
      if (!res.ok) {
        console.error(res, res.status, res.json().then(message => {
          return message
        }))
      } else {
        res.json().then(trans => {
          setTransactions(trans)
        });
      }
    })

  }
}

async function moveToTransactions(){
    setPage("transactions");
}

async function createNewAccount(){
  setDisplay("Creating User...")
  const encryptedUsername = await encrypt(user);
  const encryptedPassword = await encrypt(pass);
  const accountType = type;


  console.log("USER", encryptedUsername);
  console.log("PASS", encryptedPassword);

  fetch(`http://localhost:3000/account`, {
    method: 'POST',
    headers: {
      "content-Type": 'application/json',
    },
    body: JSON.stringify({encryptedUsername, encryptedPassword, accountType}),

  })
      .then((res) => {
        if(!res.ok) {
          console.error(res, res.status, res.json().then(message=> {return message }))
          setDisplay("Failed to create acc");

        } else {
          setDisplay("Successfully created acc");
          signIn();
        }
      })
}

async function moveToAccount(){
    setPage("dashboard");
}

async function createTransaction(){
  setDisplay("Creating User...")
  const encryptedUsername = await encrypt(user);
  const encryptedPassword = await encrypt(pass);
  const fromAccountId = fromAccount;
  const toAccountId = ToAccount;
  console.log("USER", encryptedUsername);
  console.log("PASS", encryptedPassword);

  if(fromAccount === null){
    const accountID = toAccountId;
    fetch(`http://localhost:3000/deposit`, {
      method: 'POST',
      headers: {
        "content-Type": 'application/json',
      },
      body: JSON.stringify({encryptedUsername, encryptedPassword, accountID, amount}),

    })
        .then((res) => {
          if(!res.ok) {
            console.error(res, res.status, res.json().then(message=> {return message }))
            setDisplay("Failed to create deposit");

          } else {
            setDisplay("Successfully created deposit");
            signIn();
          }
        })
  }
  else if(ToAccount===null){
    const accountID = fromAccountId;
    fetch(`http://localhost:3000/withdraw`, {
      method: 'POST',
      headers: {
        "content-Type": 'application/json',
      },
      body: JSON.stringify({encryptedUsername, encryptedPassword, accountID, amount}),

    })
        .then((res) => {
          if(!res.ok) {
            console.error(res, res.status, res.json().then(message=> {return message }))
            setDisplay("Failed to create withdraw");

          } else {
            setDisplay("Successfully created withdraw");
            signIn();
          }
        })
  }else{
    fetch(`http://localhost:3000/transfer`, {
      method: 'POST',
      headers: {
        "content-Type": 'application/json',
      },
      body: JSON.stringify({encryptedUsername, encryptedPassword, toAccountId, fromAccountId, amount}),

    })
        .then((res) => {
          if(!res.ok) {
            console.error(res, res.status, res.json().then(message=> {return message }))
            setDisplay("Failed to create transfer");

          } else {
            setDisplay("Successfully created transfer");
            signIn();
          }
        })
  }

}
  return (
    <>
      {page === "home" &&
      <div id="Home">
        <div >
          <h1>
            Welcome to Rachel Bank
          </h1>
        </div>
        <div >
          <input  id ="useAPass" onChange={e => setUser(e.target.value)} placeholder={"username"}/>
          <input type = "password" id="useAPass" onChange={e => setPass(e.target.value)} placeholder={"password"}/>
        </div>

        <div>
          <button onClick={signIn} id ="useAPass">Sign in</button>
          <button onClick={create} id ="useAPass">Create</button>
        </div>

        <div>
          <p>{display}</p>
        </div>
      </div>}

      {page === "dashboard" &&
          <div>
            <div>
              {accounts && accounts.map((acc) => (
                  <div
                      key={acc.accountID}
                      onClick={() => setSelectedAccount(acc)}>
                    <div>
                      <p>{acc.accountID}</p>
                      <p>{acc.accountType}</p>
                      <p>{acc.balance}</p>
                    </div>
                  </div>
              ))}

              <div>
                <input id="useAPass" onChange={e => setType(e.target.value)} placeholder={"type"}/>
                <button onClick={createNewAccount}>create new Account</button>
              </div>
              <div>
                <p>{display}</p>
              </div>


            </div>
            {transactions && transactions.map((t) => (
                <div
                    key={t.transactionID}
                    >
                  <div>
                    <p>id:{t.transactionID}</p>
                    <p>amt:{t.amount}</p>
                    <p>from:{t.fromAcc}</p>
                    <p>to:{t.toAcc}</p>
                  </div>
                </div>
            ))}
            <div>

            </div>
            <div>
              <button onClick={moveToTransactions}>Transfer</button>
            </div>

          </div>
      }

      {page === "transactions" &&
          <div>
            <div>
              <h1>Transactions</h1>
            </div>
            <div>
              <input id="useAPass" onChange={e => setFromAccount(e.target.value)} placeholder={"from"}/>
              <input id="useAPass" onChange={e => setToAccount(e.target.value)} placeholder={"To"}/>
              <input id="useAPass" onChange={e => setAmount(e.target.value)} placeholder={"amount"}/>

            </div>
            <div>
              <button onClick={createTransaction}>create Transaction</button>
            </div>
            <div>
              <button onClick={moveToAccount}>go to acc</button>
            </div>
          </div>
      }
    </>
  )
}


export default App
