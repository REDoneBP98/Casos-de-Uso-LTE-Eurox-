//Importamos libreria de criptografía de curvas elipticas:
import pkg from 'elliptic';
const {ec: EC} = pkg;
//Crea instancia de la curva:(generador de claves publicas, privadas...)
const ec = new EC('secp256k1');

const key = ec.genKeyPair();//Generamos una llave, que contiene ambos valores (clave publica y privada)
const publicKey = key.getPublic('hex');//Convertimos a 'hex' strings
const privateKey = key.getPrivate('hex');

console.log("tu clave pública es: " + publicKey);

console.log();

console.log("Y tu clave privada es: "+ privateKey);