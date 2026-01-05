import SHA256 from 'crypto-js/sha256.js';
import pkg from 'elliptic';
const {ec: EC} = pkg;

class Transaction{
    constructor (id, origen, destino, cantidad, pais_origen, pais_destino, concepto){
        this.id = id;
        this.origen = origen;
        this.destino = destino;
        this.cantidad = cantidad;
        this.pais_origen = pais_origen;
        this.pais_destino = pais_destino;
        this.concepto = concepto;
    }

    calculateHash(){
        return SHA256(this.id + this.origen + this.destino + this.cantidad + this.pais_origen + 
            this.pais_destino + this.concepto).toString();
    };//Transformamos los datos de la transacción a Hash, de forma que sea mas dificil de falsificar

    signTransaction(singningKey){//Firmar la transacción
        if(singningKey.getPublic('hex') !== this.origen){//Si no tienes la Key del origen error
            throw new Error('Que leches, ¿intentas robar o que?, no firmes transacciones de otras carteras');
        }

        const hashTx = this.calculateHash();//Calculamos el Hash
        const sig = singningKey.sign(hashTx, 'base64');//Firmamos
        this.signature = sig.toDER('hex');//Lo pasamos a hexadecimal
    }

    isValid(){//Esto solo comprueba que haya direccion origen y que este firmada la transacción
        if(this.origen !== null) return true;

            if(!this.signature || this.signature.length === 0){
                throw new Error('Transacción sin firmar!');
            }
            const publicKey = ec.keyFromPublic(this.origen, 'hex');
            return publicKey.verify(this.calculateHash(), this.signature);
    }

    direccionesValidas(myLlave, dest){
        if(myLlave.getPublic('hex') !== this.origen){//Si mi dirección de cartera (clave publica) coincide con la parte publica de la llave, entonces bien
            console.log("Lo sentimos, pero tu dirección de cartera no existe o es erronea");
            return false;
        }

        let ec = new EC('secp256k1');
        let llaveDest = ec.keyFromPrivate(dest);

        if(llaveDest.getPublic('hex') !== this.destino){//Comprobamos si el destino coincide (a partir de la clave privada)
            console.log("Lo sentimos, pero parece que la dirección de destino es erronea");
            return false;
        }
        
        
        return true;//Si devuelve esto, entonces es que origen y destino son reales
    }

    saldoSuficiente(origenWallet, moneda, cantidad){
        if(moneda.getBalanceOfAddress(origenWallet) < cantidad) {
            console.log("Lo sentimos, pero parece que no tienes saldo suficiente");
            return false;
        }

        return true; //Si has llegado, es que tienes saldo suficiente, de lo contrario te habra dado error
    }

};

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

    crearID(){
        const numeroRandom = (Math.floor(Math.random() * 10) + 1);
        let idAnterior = 0;
        //console.log("El numero random es: " + numeroRandom);

        if( (this.chain.length > 0) && (this.chain.at(-1).transactions.at(-1) > 0) ){
            let transacciones = this.chain.at(-1);
            idAnterior = transacciones.transactions.at(-1).id;
            console.log("IIIII: " + idAnterior + numeroRandom);
        }

        if(this.pendingTransactions.length > 0){
            idAnterior = this.pendingTransactions.at(-1).id;//Tenemos que coger el ID de la última transacción que se hizo
            console.log("EEEEE: " + idAnterior + numeroRandom);    
        }
        
        return idAnterior + numeroRandom;;
    };

    inicializarWallet(dirWallet, cantidad){//Para poder meter dinero en la cartera desde el principio
        let ID = this.crearID();

        console.log("El primer ID es: " + ID);

        this.pendingTransactions.push(new Transaction( this.crearID() ,null, dirWallet, cantidad, null, null, "Añadir fondos al monedero"));//Esta funcion solo se puede usar al inicializar la blockchain
    
        console.log("Se han añadido fondos nuevos al monedero: (" + cantidad + ")");
    }

    addTransaction(transaction) {
        if(!transaction.origen || !transaction.destino){
            throw new Error('Transaction must include from and to address');
        }

        if(!transaction.isValid()){
            throw new Error('Cannot add invalid transaction to chain');
        }

        this.pendingTransactions.push(transaction);//Antes de hacer esto, tanto el destino como el origen tienen que esta cifrados
        console.log("añadida la transacción con ID: " + transaction.id + " a la lista de transacciones.");
    }

    //Ocurre cuando se añade mas Euro de la fábrica de monedas (inflación, perdida de fondos...)
    CreacicionDeFondos() {//TODO: Hay que cambiarlo, porque creo que no usaremos POW

        let block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
        block.confirmarFondos(this.difficulty);

        this.chain.push(block);//Cada vez que añadimos una transacción la cadena de bloques se actualiza

        this.pendingTransactions = [];//La cadena de transacciones pendientes se pone a 0
    }

    //Tiene que poder añadir fondos mas a menudo, de lo contrario seria un cristo de bloques
    

    //Codigo para comprobar nuestro saldo actual, va de uno en uno mirando todas las transacciones y haciendo recuento de cuanto tenemos
    getBalanceOfAddress(direccion){
        let balance = 0; // El balance inicial es 0
       
        for(const block of this.chain){
            for(const trans of block.transactions){

                if(trans.origen === direccion){
                    balance -= trans.cantidad;
                }

                if(trans.destino === direccion){
                    balance += trans.cantidad;
                }
            }
        }
        return balance;
    }


    createGenesisBlock(){//Creamos el bloque 0
        return new Block("01/01/2017", [], "0");
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