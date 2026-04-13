require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/aeromexico';

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// MongoDB
mongoose.connect(MONGO_URI)
  .then(() => logger.info('Conectado a MongoDB'))
  .catch(err => logger.error(`Error conectando a MongoDB: ${err.message}`));

// Schema de reservaciones
const bookingSchema = new mongoose.Schema({
  flightId: String,
  origin: String,
  destination: String,
  date: String,
  airline: String,
  price: Number,
  passenger: {
    name: String,
    email: String
  },
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Datos
const ROUTES = [
  { origin: 'Ciudad de México', originCode: 'MEX', destination: 'Cancún', destinationCode: 'CUN', duration: '2h 10m' },
  { origin: 'Ciudad de México', originCode: 'MEX', destination: 'Guadalajara', destinationCode: 'GDL', duration: '1h 05m' },
  { origin: 'Ciudad de México', originCode: 'MEX', destination: 'Monterrey', destinationCode: 'MTY', duration: '1h 20m' },
  { origin: 'Ciudad de México', originCode: 'MEX', destination: 'Los Cabos', destinationCode: 'SJD', duration: '2h 30m' },
  { origin: 'Ciudad de México', originCode: 'MEX', destination: 'Puerto Vallarta', destinationCode: 'PVR', duration: '1h 45m' },
  { origin: 'Guadalajara', originCode: 'GDL', destination: 'Cancún', destinationCode: 'CUN', duration: '2h 50m' },
  { origin: 'Guadalajara', originCode: 'GDL', destination: 'Ciudad de México', destinationCode: 'MEX', duration: '1h 05m' },
  { origin: 'Monterrey', originCode: 'MTY', destination: 'Cancún', destinationCode: 'CUN', duration: '2h 40m' },
  { origin: 'Monterrey', originCode: 'MTY', destination: 'Ciudad de México', destinationCode: 'MEX', duration: '1h 20m' },
  { origin: 'Cancún', originCode: 'CUN', destination: 'Ciudad de México', destinationCode: 'MEX', duration: '2h 10m' },
];

const AIRLINES = ['Aeroméxico', 'Viva', 'United'];
const FLIGHT_TIMES = ['06:00', '07:30', '09:15', '11:00', '13:45', '15:30', '17:00', '19:20', '21:00'];

// Precio Dinamico
function generatePrice(base, date) {
  const demandFactor = Math.random() * 0.4 + 0.8;
  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay();
  const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) ? 1.2 : 1.0;
  return Math.round(base * demandFactor * weekendMultiplier);
}

//  Rutas 

// GET /flights - Buscar vuelos
app.get('/api/flights', (req, res) => {
  const { origin, destination, date } = req.query;

  logger.info(`Búsqueda de vuelos: ${origin || 'cualquier origen'} → ${destination || 'cualquier destino'} | Fecha: ${date || 'cualquier fecha'}`);

  let routes = ROUTES;

  if (origin) {
    routes = routes.filter(r =>
      r.origin.toLowerCase().includes(origin.toLowerCase()) ||
      r.originCode.toLowerCase() === origin.toLowerCase()
    );
  }
  if (destination) {
    routes = routes.filter(r =>
      r.destination.toLowerCase().includes(destination.toLowerCase()) ||
      r.destinationCode.toLowerCase() === destination.toLowerCase()
    );
  }

  if (routes.length === 0) {
    logger.warn(`No se encontraron vuelos para la ruta: ${origin} → ${destination}`);
    return res.json({ flights: [], message: 'No se encontraron vuelos para esta ruta.' });
  }

  const flights = [];
  routes.forEach((route, idx) => {
    const basePrices = [1800, 2400, 3200];
    AIRLINES.forEach((airline, aIdx) => {
      const basePrice = basePrices[aIdx];
      const departureTime = FLIGHT_TIMES[(idx + aIdx * 3) % FLIGHT_TIMES.length];
      const [h, m] = departureTime.split(':').map(Number);
      const arrivalDate = new Date(date || Date.now());
      const durationMins = parseInt(route.duration) * 60 + (parseInt(route.duration.split('h ')[1]) || 0);
      arrivalDate.setHours(h);
      arrivalDate.setMinutes(m + durationMins);
      const arrivalTime = `${String(arrivalDate.getHours()).padStart(2,'0')}:${String(arrivalDate.getMinutes()).padStart(2,'0')}`;

      flights.push({
        id: `FL${String(idx * 3 + aIdx + 1).padStart(3, '0')}`,
        airline,
        origin: route.origin,
        originCode: route.originCode,
        destination: route.destination,
        destinationCode: route.destinationCode,
        departure: departureTime,
        arrival: arrivalTime,
        duration: route.duration,
        date: date || new Date().toISOString().split('T')[0],
        price: generatePrice(basePrice, date || new Date()),
        seatsAvailable: Math.floor(Math.random() * 40) + 5,
        class: 'Económica'
      });
    });
  });

  flights.sort((a, b) => a.price - b.price);
  logger.info(`Se encontraron ${flights.length} vuelos`);
  res.json({ flights });
});

// POST /book - Crear reserva
app.post('/api/book', async (req, res) => {
  const { flightId, origin, destination, date, airline, price, passenger } = req.body;

  if (!flightId || !passenger?.name || !passenger?.email) {
    logger.warn(`Intento de reserva con datos incompletos: ${JSON.stringify(req.body)}`);
    return res.status(400).json({ error: 'Datos incompletos. Se requiere flightId y datos del pasajero.' });
  }

  try {
    const booking = new Booking({ flightId, origin, destination, date, airline, price, passenger });
    await booking.save();
    logger.info(`Reserva creada: ${booking._id} | Vuelo: ${flightId} | Pasajero: ${passenger.name} | ${origin} → ${destination}`);
    res.status(201).json({
      success: true,
      message: '¡Reserva confirmada exitosamente!',
      booking: {
        id: booking._id,
        flightId,
        origin,
        destination,
        date,
        airline,
        price,
        passenger,
        createdAt: booking.createdAt
      }
    });
  } catch (err) {
    logger.error(`Error al guardar reserva: ${err.message}`);
    res.status(500).json({ error: 'Error interno al procesar la reserva.' });
  }
});

// GET /bookings - Listar todas las reservas
app.get('/api/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).limit(50);
    logger.info(`Consulta de reservas: ${bookings.length} registros`);
    res.json({ bookings });
  } catch (err) {
    logger.error(`Error al obtener reservas: ${err.message}`);
    res.status(500).json({ error: 'Error al obtener reservas.' });
  }
});

// Check de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`Servidor iniciado en puerto ${PORT}`);
});
