// import { url } from "../config/db.config.js";
// import mongoose from "mongoose";

// const db = {};

// db.mongoose = mongoose;
// db.url = url;
// db.leaderboard = require("./leaderboard.model.js.js").default(mongoose);

// export default db;

import Patient from "./patient.model";
import Vitals from "./vitals.model";


export { Patient, Vitals };