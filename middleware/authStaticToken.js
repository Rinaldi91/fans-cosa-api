require('dotenv').config();

const staticUser = {
  id: 11,
  role_id: 5,
  name: 'User Bridging Mitra Sehat',
  email: 'bridging@gmail.com',
  role: 'User Bridging',
  permissions: [
    'view_dashboard',
    'create_mapping_patient',
    'view_bridging_glucose_test'
  ]
};

const token = req.headers['authorization'];
const expectedToken = `Bearer ${process.env.STATIC_BRIDGING_TOKEN}`;
const authenticateStaticToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (token !== expectedToken) {
    return res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Unauthorized: Invalid static token.'
    });
  }

  // Simulasikan user login untuk static token
  req.user = staticUser;
  next();
};

module.exports = authenticateStaticToken;
