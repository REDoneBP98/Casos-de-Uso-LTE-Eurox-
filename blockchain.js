import SHA256 from 'crypto-js/sha256.js';
import pkg from 'elliptic';
const {ec: EC} = pkg;

class Transaction{
    constructor (fromAddress, toAddress, amount){
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
    }

    calculateHash(){//utilizamos los datos de origen, destino y cantidad para crear el Hash
        return SHA256(this.fromAddress + this.toAddress + this.amount).toString();
    };

    signTransaction(singningKey){//Firmar la transacción
        if(singningKey.getPublic('hex') !== this.fromAddress){//Si no tienes la Key del origen error
            throw new Error('Que leches, ¿intentas robar o que?, no firmes transacciones de otras carteras');
        }

        const hashTx = this.calculateHash();//Calculamos el Hash
        const sig = singningKey.sign(hashTx, 'base64');//Firmamos
        this.signature = sig.toDER('hex');//Lo pasamos a hexadecimal
    }

    isValid(){//Esto solo comprueba que haya direccion origen y que este firmada la transacción
        if(this.fromAddress !== null) return true;

            if(!this.signature || this.signature.length === 0){
                throw new Error('Transacción sin firmar!');
            }
            const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
            return publicKey.verify(this.calculateHash(), this.signature);
    }

    direccionesValidas(myLlave, dest){
        if(myLlave.getPublic('hex') !== this.fromAddress){//Si mi dirección de cartera (clave publica) coincide con la parte publica de la llave, entonces bien
            console.log("Lo sentimos, pero tu dirección de cartera no existe o es erronea");
            return false;
        }

        let ec = new EC('secp256k1');
        let llaveDest = ec.keyFromPrivate(dest);

        if(llaveDest.getPublic('hex') !== this.toAddress){//Comprobamos si el destino coincide (a partir de la clave privada)
            console.log("Lo sentimos, pero parece que la dirección de destino es erronea");
            return false;
        }
        
        
        return true;//Si llega hasta aquí, entonces el origen y destino son reales.
    }

    saldoSuficiente(origenWallet, moneda, cantidad){
        if(moneda.getBalanceOfAddress(origenWallet) < cantidad) {
            console.log("Lo sentimos, pero parece que no tienes saldo suficiente");
            return false;
        }

        return true; //Si has llegado, es que tienes saldo suficiente, de lo contrario te habra dado error
    }
}

class Block{
    constructor(timestamp, transactions, previousHash = ""){
    this.previousHash = previousHash;

    this.timestamp = timestamp;
    
    this.transactions = transactions;

    this.hash = this.calculatehash();

    this.nonce = 0;

    }

    calculatehash() {
        return SHA256(this.previousHash + this.timestamp + 
            JSON.stringify(this.transactions) + this.nonce).toString();
    }

    hasValidTransactions(){
        for(const tx of this.transactions){
            if(!tx.isValid()){//Si la transacción no es valida, error!
                return false;
            }
        }

    return true;
    }

    confirmarFondos(difficulty) {//Mientras desde el punto 0 al difficulty no haya la cantidad necesaria de 0s en el Hash, no para.
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {//En el hash, desde la letra 0 al difficulty tiene que ser igual que lo de la derecha
            this.nonce++;
            this.hash = this.calculatehash();
        }

        console.log('BLOCK MINED: ' + this.hash);
    }

    
}


class Blockchain{
    constructor() {
        this.chain = [this.createGenesisBlock()];

        //Declaramos el constructor de difficulty e inicializamos
        this.difficulty = 3;

        //Lugar de almacenaje de transacciones
        this.pendingTransactions = [];

    }

    inicializarWallet(dirWallet, cantidad){//Para poder meter dinero en la cartera desde el principio
        this.pendingTransactions.push(new Transaction(null, dirWallet, cantidad));//Esta funcion solo se puede usar al inicializar la blockchain
    }

    addTransaction(transaction) {
        if(!transaction.fromAddress || !transaction.toAddress){
            throw new Error('Transaction must include from and to address');
        }

        if(!transaction.isValid()){
            throw new Error('Cannot add invalid transaction to chain');
        }

        this.pendingTransactions.push(transaction);//Antes de hacer esto, tanto el destino como el origen tienen que esta cifrados
    }

    //Ocurre cuando se añade mas Euro de la fábrica de monedas (inflación, perdida de fondos...)
    CreacicionDeFondos(direccionDestino) {
        
        //const rewardTx = new Transaction(null, direccionDestino, 0);//Le añadimos dinero de la nada
        //this.pendingTransactions.push(rewardTx);

        let block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
        block.confirmarFondos(this.difficulty);

        this.chain.push(block);//Cada vez que añadimos una transacción la cadena de bloques se actualiza

        this.pendingTransactions = [];//La cadena de transacciones pendientes se pone a 0
    }

    //Tiene que poder añadir fondos mas a menudo, de lo contrario seria un cristo de bloques
    

    //Codigo para comprobar nuestro saldo actual, va de uno en uno mirando todas las transacciones y haciendo recuento de cuanto tenemos
    getBalanceOfAddress(address){
        let balance = 0; // El balance inicial es 0
       
        for(const block of this.chain){
            for(const trans of block.transactions){

                if(trans.fromAddress === address){
                    balance -= trans.amount;
                }

                if(trans.toAddress === address){
                    balance += trans.amount;
                }
            }
        }
        return balance;
    }


    createGenesisBlock(){//Creamos el bloque 0
        return new Block("01/01/2017", "Genesis block", "0");
    }


    getLatestBlock(){//
        return this.chain[this.chain.length - 1];
    }


    addBlock(newBlock){
    //Cogemos la cara previousHash de nuestro bloque y le añadimos el hash de la anterior
    newBlock.previousHash = this.getLatestBlock().hash;

    //Calculamos un nuevo hash para el bloque (lo anterior)
    //newBlock.hash = newBlock.calculateHash();
    newBlock.confirmarFondos(this.difficulty);

    //Y añadimos este nuevo bloque a la cadena
    this.chain.push(newBlock);

    }

    isChainValid(){//Si la cadena de bloques es valida o no
        for (let i = 1; i < this.chain.length; i++){
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!currentBlock.hasValidTransactions()) {
                return false;
            }//Estos dos ultimos estaban comentados ns porque
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }

            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }


    return true;

    }
}

//Parte 4 practicas
//module.exports.Blockchain = Blockchain;
//module.exports.Transaction = Transaction;
export {Blockchain, Transaction};