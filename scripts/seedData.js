const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Web3 = require("web3");

const GANACHE_RPC_URL = "http://127.0.0.1:7545";

const HOSPITALS = [
  { id: 1, name: "Apollo Hospitals", address: "Chennai", specialisation: "Multi-Speciality" },
  { id: 2, name: "Fortis Healthcare", address: "Mumbai", specialisation: "Cardiology" },
  { id: 3, name: "AIIMS", address: "Delhi", specialisation: "General Medicine" },
  { id: 4, name: "Manipal Hospital", address: "Bangalore", specialisation: "Neurology" },
  { id: 5, name: "Narayana Health", address: "Kolkata", specialisation: "Cardiac Surgery" },
  { id: 6, name: "Medanta", address: "Gurugram", specialisation: "Oncology" },
  { id: 7, name: "Kokilaben Hospital", address: "Mumbai", specialisation: "Orthopedics" },
  { id: 8, name: "Christian Medical College", address: "Vellore", specialisation: "General Medicine" },
  { id: 9, name: "JIPMER", address: "Puducherry", specialisation: "Multi-Speciality" },
  { id: 10, name: "PSR Hospital", address: "Sivakasi", specialisation: "General Medicine" }
];

const currentDate = new Date().toISOString().split("T")[0];

const PATIENTS = [
  {
    id: 1,
    name: "Arjun Kumar",
    age: 35,
    gender: "Male",
    height: "5.9 ft",
    weight: "78 kg",
    address: "Chennai",
    phone: "9876543210",
    email: "arjun.kumar@example.com",
    date: currentDate,
    attendantName: "Anita Kumar",
    attendantRelation: "Spouse",
    attendantPhone: "9123456780"
  },
  {
    id: 2,
    name: "Priya Sharma",
    age: 28,
    gender: "Female",
    height: "5.4 ft",
    weight: "58 kg",
    address: "Mumbai",
    phone: "9876501234",
    email: "priya.sharma@example.com",
    date: currentDate,
    attendantName: "Rakesh Sharma",
    attendantRelation: "Brother",
    attendantPhone: "9001234567"
  },
  {
    id: 3,
    name: "Rajesh Patel",
    age: 45,
    gender: "Male",
    height: "5.7 ft",
    weight: "82 kg",
    address: "Ahmedabad",
    phone: "9812345678",
    email: "rajesh.patel@example.com",
    date: currentDate,
    attendantName: "Meena Patel",
    attendantRelation: "Spouse",
    attendantPhone: "9898989898"
  },
  {
    id: 4,
    name: "Kavitha Nair",
    age: 32,
    gender: "Female",
    height: "5.5 ft",
    weight: "61 kg",
    address: "Kochi",
    phone: "9765432109",
    email: "kavitha.nair@example.com",
    date: currentDate,
    attendantName: "Suresh Nair",
    attendantRelation: "Husband",
    attendantPhone: "9112233445"
  },
  {
    id: 5,
    name: "Mohammed Ali",
    age: 50,
    gender: "Male",
    height: "5.8 ft",
    weight: "80 kg",
    address: "Hyderabad",
    phone: "9654321098",
    email: "mohammed.ali@example.com",
    date: currentDate,
    attendantName: "Ayesha Ali",
    attendantRelation: "Daughter",
    attendantPhone: "9011223344"
  },
  {
    id: 6,
    name: "Sunita Devi",
    age: 40,
    gender: "Female",
    height: "5.3 ft",
    weight: "64 kg",
    address: "Patna",
    phone: "9543210987",
    email: "sunita.devi@example.com",
    date: currentDate,
    attendantName: "Ravi Devi",
    attendantRelation: "Son",
    attendantPhone: "9090909090"
  },
  {
    id: 7,
    name: "Vikram Singh",
    age: 29,
    gender: "Male",
    height: "6.0 ft",
    weight: "76 kg",
    address: "Lucknow",
    phone: "9432109876",
    email: "vikram.singh@example.com",
    date: currentDate,
    attendantName: "Pooja Singh",
    attendantRelation: "Sister",
    attendantPhone: "9445566778"
  },
  {
    id: 8,
    name: "Anitha Rajan",
    age: 55,
    gender: "Female",
    height: "5.2 ft",
    weight: "67 kg",
    address: "Vellore",
    phone: "9321098765",
    email: "anitha.rajan@example.com",
    date: currentDate,
    attendantName: "Rajan Kumar",
    attendantRelation: "Husband",
    attendantPhone: "9556677889"
  },
  {
    id: 9,
    name: "Suresh Babu",
    age: 62,
    gender: "Male",
    height: "5.6 ft",
    weight: "73 kg",
    address: "Puducherry",
    phone: "9210987654",
    email: "suresh.babu@example.com",
    date: currentDate,
    attendantName: "Lakshmi Babu",
    attendantRelation: "Spouse",
    attendantPhone: "9667788990"
  },
  {
    id: 10,
    name: "Deepa Menon",
    age: 38,
    gender: "Female",
    height: "5.4 ft",
    weight: "60 kg",
    address: "Bengaluru",
    phone: "9109876543",
    email: "deepa.menon@example.com",
    date: currentDate,
    attendantName: "Arun Menon",
    attendantRelation: "Brother",
    attendantPhone: "9778899001"
  }
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadConfigFromFrontend() {
  const configPath = path.resolve(__dirname, "..", "frontend", "config.js");
  const content = fs.readFileSync(configPath, "utf8");

  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(content, sandbox);

  const blockchainConfig = sandbox.window.BLOCKCHAIN_CONFIG || {};
  const contractAddresses = blockchainConfig.contracts || sandbox.window.CONTRACT_ADDRESSES || {};

  if (!contractAddresses.Hospital || !contractAddresses.Patient) {
    throw new Error("Contract addresses not found in frontend/config.js. Run truffle migrate first.");
  }

  return {
    networkId: blockchainConfig.networkId,
    addresses: contractAddresses
  };
}

async function main() {
  let web3;

  try {
    console.log("\n🚀 Starting healthcare blockchain seed script...\n");

    const { addresses, networkId } = loadConfigFromFrontend();
    console.log(`📦 Loaded contract addresses from frontend/config.js (networkId: ${networkId ?? "N/A"})`);

    const hospitalArtifact = readJson(path.resolve(__dirname, "..", "build", "contracts", "Hospital.json"));
    const patientArtifact = readJson(path.resolve(__dirname, "..", "build", "contracts", "Patient.json"));

    web3 = new Web3(new Web3.providers.HttpProvider(GANACHE_RPC_URL));

    const hospitalContract = new web3.eth.Contract(hospitalArtifact.abi, addresses.Hospital);
    const patientContract = new web3.eth.Contract(patientArtifact.abi, addresses.Patient);

    const accounts = await web3.eth.getAccounts();
    if (!accounts || accounts.length < 2) {
      throw new Error("Need at least 2 Ganache accounts. Please ensure Ganache is running with default accounts.");
    }

    const hospitalRegistrar = accounts[0];
    const patientRegistrar = accounts[1];

    console.log(`🏥 Hospital registrar: ${hospitalRegistrar}`);
    console.log(`🧑‍⚕️ Patient registrar: ${patientRegistrar}\n`);

    for (const hospital of HOSPITALS) {
      try {
        const exists = await hospitalContract.methods.isHospitalRegistered(hospital.id).call();
        if (exists) {
          console.log(`ℹ️ Hospital ${hospital.id} already exists: ${hospital.name}`);
          continue;
        }

        const receipt = await hospitalContract.methods
          .registerHospital(hospital.id, hospital.name, hospital.address, hospital.specialisation)
          .send({ from: hospitalRegistrar, gas: 800000 });

        console.log(`✅ Hospital ${hospital.id} registered: ${hospital.name} - ${receipt.transactionHash}`);
      } catch (error) {
        console.error(`❌ Failed hospital ${hospital.id} (${hospital.name}): ${error.message}`);
      }
    }

    console.log("");

    for (const patient of PATIENTS) {
      try {
        const exists = await patientContract.methods.isPatientRegistered(patient.id).call();
        if (exists) {
          console.log(`ℹ️ Patient ${patient.id} already exists: ${patient.name}`);
          continue;
        }

        const receipt = await patientContract.methods
          .registerPatient(
            patient.id,
            patient.name,
            patient.age,
            patient.gender,
            patient.height,
            patient.weight,
            patient.address,
            patient.phone,
            patient.email,
            patient.date,
            patient.attendantName,
            patient.attendantRelation,
            patient.attendantPhone
          )
          .send({ from: patientRegistrar, gas: 1200000 });

        console.log(`✅ Patient ${patient.id} registered: ${patient.name} - ${receipt.transactionHash}`);
      } catch (error) {
        console.error(`❌ Failed patient ${patient.id} (${patient.name}): ${error.message}`);
      }
    }

    console.log("\n✅ All 10 hospitals and 10 patients registration flow completed!\n");
  } catch (error) {
    console.error("\n❌ Seed script failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (web3 && web3.currentProvider && typeof web3.currentProvider.disconnect === "function") {
      web3.currentProvider.disconnect();
    }
  }
}

main();
