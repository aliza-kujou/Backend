require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'kazuma_secret_fallback_key';
const DB_FILE = path.join(__dirname, 'users.json');

if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

const reglasPaises = {
    "RD": { prefijo: "+1", sufijos: ["839", "879"], digitos: 7 },
    "CU": { prefijo: "+53", sufijos: ["63", "64"], digitos: 6 },
    "US": { prefijo: "+1", sufijos: ["555"], digitos: 7 },
    "CA": { prefijo: "+1", sufijos: ["777"], digitos: 7 },
    "MX": { prefijo: "+52", sufijos: ["99"], digitos: 8 },
    "AR": { prefijo: "+54", sufijos: ["99"], digitos: 9 },
    "BR": { prefijo: "+55", sufijos: ["99"], digitos: 9 },
    "CO": { prefijo: "+57", sufijos: ["39"], digitos: 8 },
    "CL": { prefijo: "+56", sufijos: ["99"], digitos: 8 },
    "PE": { prefijo: "+51", sufijos: ["99"], digitos: 7 },
    "VE": { prefijo: "+58", sufijos: ["49"], digitos: 7 },
    "EC": { prefijo: "+593", sufijos: ["99"], digitos: 7 },
    "GT": { prefijo: "+502", sufijos: ["99"], digitos: 6 },
    "BO": { prefijo: "+591", sufijos: ["79"], digitos: 6 },
    "HN": { prefijo: "+504", sufijos: ["99"], digitos: 6 },
    "PY": { prefijo: "+595", sufijos: ["99"], digitos: 7 },
    "SV": { prefijo: "+503", sufijos: ["79"], digitos: 6 },
    "NI": { prefijo: "+505", sufijos: ["79"], digitos: 6 },
    "CR": { prefijo: "+506", sufijos: ["89"], digitos: 6 },
    "PA": { prefijo: "+507", sufijos: ["69"], digitos: 6 },
    "UY": { prefijo: "+598", sufijos: ["99"], digitos: 6 },
    "JM": { prefijo: "+1876", sufijos: ["55"], digitos: 5 },
    "PR": { prefijo: "+1", sufijos: ["939"], digitos: 7 },
    "BS": { prefijo: "+1242", sufijos: ["55"], digitos: 5 },
    "BB": { prefijo: "+1246", sufijos: ["55"], digitos: 5 },
    "BZ": { prefijo: "+501", sufijos: ["69"], digitos: 5 },
    "GY": { prefijo: "+592", sufijos: ["69"], digitos: 5 },
    "SR": { prefijo: "+597", sufijos: ["89"], digitos: 5 },
    "TT": { prefijo: "+1868", sufijos: ["55"], digitos: 5 }
};

function leerUsuarios() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function guardarUsuarios(usuarios) {
    fs.writeFileSync(DB_FILE, JSON.stringify(usuarios, null, 2));
}

function generarNumeroVirtual(codigoPais) {
    const regla = reglasPaises[codigoPais.toUpperCase()];
    if (!regla) return null;
    const sufijo = regla.sufijos[Math.floor(Math.random() * regla.sufijos.length)];
    let restantes = "";
    for (let i = 0; i < regla.digitos; i++) {
        restantes += Math.floor(Math.random() * 10);
    }
    return `${regla.prefijo}${sufijo}${restantes}`;
}

app.post('/api/auth/register', (req, res) => {
    const { pais, password, alias } = req.body;
    if (!pais || !password) {
        return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    if (!reglasPaises[pais.toUpperCase()]) {
        return res.status(400).json({ error: 'Pais no soportado o excluido' });
    }
    const usuarios = leerUsuarios();
    let numeroVirtual = "";
    let intentos = 0;
    do {
        numeroVirtual = generarNumeroVirtual(pais);
        intentos++;
    } while (usuarios[numeroVirtual] && intentos < 10);

    if (usuarios[numeroVirtual]) {
        return res.status(500).json({ error: 'No se pudo generar un numero unico' });
    }

    usuarios[numeroVirtual] = {
        jid: `${numeroVirtual}@chat.kazuma.app`,
        password: password,
        alias: alias || 'Usuario',
        bio: '¡Hola! Estoy usando Kazuma Chat.',
        created_at: Date.now()
    };
    guardarUsuarios(usuarios);

    const token = jwt.sign({ phone: numeroVirtual, jid: usuarios[numeroVirtual].jid }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, phone: numeroVirtual, jid: usuarios[numeroVirtual].jid, token });
});

app.post('/api/auth/login', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.status(400).json({ error: 'Faltan credenciales' });
    }
    const usuarios = leerUsuarios();
    const usuario = usuarios[phone];
    if (!usuario || usuario.password !== password) {
        return res.status(401).json({ error: 'Credenciales invalidas' });
    }
    const token = jwt.sign({ phone, jid: usuario.jid }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, phone, jid: usuario.jid, token });
});

app.listen(PORT, () => {
    console.log(`Servidor de Kazuma corriendo en puerto ${PORT}`);
});