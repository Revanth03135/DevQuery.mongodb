const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const users = require("../models/userModel");
const { generateToken } = require("../utils/jwtUtils");

const register = async (req, res) => {
  const { email, password } = req.body;
  const existing = users.find((u) => u.email === email);
  if (existing) return res.status(400).json({ message: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: uuidv4(), email, password: hashed };
  users.push(newUser);
  const token = generateToken(newUser.id);
  res.status(201).json({ token });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Invalid credentials" });

  const token = generateToken(user.id);
  res.json({ token });
};

module.exports = { register, login };
