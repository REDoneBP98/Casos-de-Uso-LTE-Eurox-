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
        this.signature = null;
    }

    //Transformar los datos de la transacción a hash
    calculateHash(){
        return SHA256(this.id + this.origen + this.destino + this.cantidad + this.pais_origen + 
            this.pais_destino + this.concepto).toString();
    };

    signTransaction(singningKey){
        if(singningKey.getPublic('hex') !== this.origen){ //Si no tienes la key del origen, error
            throw new Error('Qué leches, ¿intentas robar o qué? No firmes transacciones de otras carteras');
        }
        const hashTx = this.calculateHash(); //Calculamos el hash
        const sig = singningKey.sign(hashTx, 'base64'); //Firmamos
        this.signature = sig.toDER('hex'); //Lo pasamos a hexadecimal
    }
};

class Block {
    constructor(timestamp, transactions, previousHash = "", validator) {
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.validator = validator; //Clave pública del validador
        this.hash = this.calculateHash();
        this.signature = null;
    }

    calculateHash() {
        return SHA256(
            this.previousHash +
            this.timestamp +
            JSON.stringify(this.transactions) +
            this.validator
        ).toString();
    }

    hasValidTransactions() {
        for (const tx of this.transactions) {
            if (!tx.isValid()) return false;
        }
        return true;
    }

    signBlock(signingKey) {
        if (signingKey.getPublic('hex') !== this.validator) {
            throw new Error("No eres el validador!");
        }
        this.signature = signingKey.sign(this.hash, 'hex').toDER('hex');
    }

    isValidBlock() {
        if (!this.signature){
            return false;
        }
        const ec = new EC('secp256k1');
        const key = ec.keyFromPublic(this.validator, 'hex');
        return key.verify(this.hash, this.signature);
    }
}

class Blockchain{
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.pendingTransactions = []; //Lista de almacenaje de transacciones
    }

    crearID() {
        let maxID = 0;
        //Recorremos todos los bloques para encontrar el ID más alto usado
        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.id > maxID){
                    maxID = tx.id;
                }
            }
        }
        //Recorremos las transacciones pendientes para incluirlas también
        for (const tx of this.pendingTransactions) {
            if (tx.id > maxID) maxID = tx.id;
        }
        //El nuevo ID será el siguiente número
        return maxID + 1;
    }

    //Para poder meter dinero en la cartera al principio
    inicializarWallet(dirWallet, cantidad){ 
        let id = this.crearID();
        this.pendingTransactions.push(new Transaction(id, null, dirWallet, cantidad, null, null, "Inicializar wallet"));
        console.log("Se han añadido fondos nuevos al monedero: " + cantidad);
    }

    addTransaction(transaction) {
        if(!transaction.origen || !transaction.destino){
            throw new Error('Transacción inválida, debe tener dirección de origen y destino.');
        }
        if(!this.isValidTransaction(transaction)){
            throw new Error('No se puede añadir una transacción inválida.');
        }
        this.pendingTransactions.push(transaction); //Antes de hacer esto, tanto el destino como el origen tienen que estar cifrados
        console.log("Añadida la transacción con id " + transaction.id + " a la lista de transacciones.");
    }

    //Elegir validador para PoS (cuanto más dinero, más probabilidades de validar)
    selectValidator() {
        let balances = {};
        let totalStake = 0;

        for (const block of this.chain) {
            for (const tx of block.transactions) {
                if (tx.destino) {
                    balances[tx.destino] = (balances[tx.destino] || 0) + tx.cantidad;
                }
                if (tx.origen) {
                    balances[tx.origen] = (balances[tx.origen] || 0) - tx.cantidad;
                }
            }
        }

        for (const addr in balances) {
            if (balances[addr] > 0) totalStake += balances[addr];
        }

        let random = Math.random() * totalStake;
        let cumulative = 0;

        for (const addr in balances) {
            if (balances[addr] > 0) {
                cumulative += balances[addr];
                if (cumulative >= random) return addr;
            }
        }

        return null;
    }

    //Elige validador, crea un bloque, lo firma y lo añade
    createBlockPOS(signingKeyValidador) {
        const validator = this.selectValidator();

        if (!validator) {
            console.log("No hay validador disponible");
            return;
        }
        //Comprobamos que la clave privada coincide con el validador
        if (signingKeyValidador.getPublic('hex') !== validator) {
            throw new Error("La clave proporcionada no corresponde al validador seleccionado.");
        }
        //Creamos el bloque con las transacciones pendientes
        const block = new Block(
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash,
            validator
        );

        //Firmamos el bloque
        block.signBlock(signingKeyValidador);
        //Validamos el bloque antes de añadirlo
        if (!block.isValidBlock()) {
            throw new Error("El bloque no es válido, no se añade a la blockchain.");
        }
        //Añadimos el bloque a la cadena
        this.chain.push(block);
        //Limpiamos las transacciones pendientes
        this.pendingTransactions = [];

        //Recompensa por validar
        const recompensa = 10; 
        const rewardTx = new Transaction(
                this.crearID(),
                null,             
                validator,        
                recompensa,
                null,
                null,
                "Recompensa por validar bloque"
        );

        // Añadir la transacción de recompensa a las pendientes
        this.pendingTransactions.push(rewardTx);

        console.log("Bloque validado y añadido por:", validator);
    }

    //Comprueba nuestro saldo actual, va de uno en uno mirando todas las transacciones y haciendo recuento de cuánto tenemos
    getBalanceOfAddress(direccion){
        let balance = 0; 

        //Primero sumamos y restamos según los bloques ya minados
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

        //Luego comprobamos las transacciones pendientes
        for(const trans of this.pendingTransactions){
            if(trans.origen === direccion){
                balance -= trans.cantidad;
            }
            if(trans.destino === direccion){
                balance += trans.cantidad;
            }
        }

        return balance;
}
    isValidTransaction(transaction) {
        if (transaction.origen === null) return true;
        if (!transaction.signature || transaction.signature.length === 0) {
            throw new Error("Transacción sin firmar!'");
        }
        if(this.getBalanceOfAddress(transaction.origen) < transaction.cantidad) {
            throw new Error("Saldo insuficiente!");
        }
        const ec = new EC('secp256k1');
        const publicKey = ec.keyFromPublic(transaction.origen, 'hex');
        return publicKey.verify(transaction.calculateHash(), transaction.signature);
    }

    //Crear el bloque 0
    createGenesisBlock(){
       return new Block("01/01/2017", [], "0", "genesis");
    }

    getLatestBlock(){//
        return this.chain[this.chain.length - 1];
    }

    isChainValid(){ 
        for (let i = 1; i < this.chain.length; i++){
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            if (!currentBlock.isValidBlock()){
                return false;
            }
            if (!currentBlock.hasValidTransactions()) {
                return false;
            }
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