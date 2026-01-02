import {Blockchain, Transaction} from "./blockchain.js";
import pkg from 'elliptic';
const {ec: EC} = pkg;

const ec = new EC('secp256k1');

const myKey = ec.keyFromPrivate('0bc0de8d543402a45d1075272c4ce64100f19e2228bbc7cb7f3f36b60b469621');//Le pasamos la clave privada creada anteriormente
const myWalletAddress = myKey.getPublic('hex');//Hexadecimal de mi clave publica

const keyPrueba = ec.keyFromPrivate('7e75a138c1d3749466503c0792f39aec1d0ab2821a9876da95393f2591bdb378');
const dirWalletPrueba = keyPrueba.getPublic('hex');//Dirección de pruebas

const nknCoin = new Blockchain();
nknCoin.inicializarWallet(myWalletAddress, 20);//Esto inicializa mi cartera con lo que pongas
nknCoin.minePendingTransactions(null);

//---------------PARTE PRACTICA-----------------

console.log();
console.log("Mi saldo actual es: ", nknCoin.getBalanceOfAddress(myWalletAddress));

console.log();

const tx5 = new Transaction(myWalletAddress, "048cf5f7394fbd1a76bde65c025d22c8b8e17481b69ec7240bb51ec7285c2c73a5f9e6697ef5be3fd49241646bda0832faa72b57bc79de15de4aaeea0326d53734", 10);
tx5.signTransaction(myKey);

console.log("El origen tiene fondos suficientes? ", tx5.saldoSuficiente(myWalletAddress, nknCoin, 10) ? 'Yep' : 'Nop');
console.log("Origen y destino validos? ", tx5.direccionesValidas(myKey, "819613a98aca1c943b862e578d1b684c4f541121049cc7a31f0249a6e9007656") ? 'Yep' : 'Nop');


nknCoin.addTransaction(tx5);
nknCoin.minePendingTransactions(myWalletAddress);
console.log("Recompensa por minar: 50");

console.log("Balance de mi cuenta: ",nknCoin.getBalanceOfAddress(myWalletAddress));

//console.log(nknCoin.chain);

//------------Cosas a solucionar---------------
//Se puede minar en nuestra blockchai? entiendo que no, que solo pueden hacerlo los bancos para transpasar de fisico a digital
//El dinero de las cuentas solo debe des visible para el banco y el usuario, para nadie mas