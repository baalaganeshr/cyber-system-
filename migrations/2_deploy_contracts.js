const fs = require("fs");
const path = require("path");

const Hospital = artifacts.require("Hospital");
const Doctor = artifacts.require("Doctor");
const Patient = artifacts.require("Patient");
const MedicalRecord = artifacts.require("MedicalRecord");

module.exports = async function (deployer, network) {
  await deployer.deploy(Hospital);
  const hospital = await Hospital.deployed();

  await deployer.deploy(Doctor, hospital.address);
  const doctor = await Doctor.deployed();

  await deployer.deploy(Patient, doctor.address);
  const patient = await Patient.deployed();

  await deployer.deploy(MedicalRecord, doctor.address, patient.address);
  const medicalRecord = await MedicalRecord.deployed();

  const networkId = await web3.eth.getChainId();

  const frontendConfigPath = path.join(__dirname, "..", "frontend", "config.js");
  const config = {
    network,
    networkId,
    updatedAt: new Date().toISOString(),
    contracts: {
      Hospital: hospital.address,
      Doctor: doctor.address,
      Patient: patient.address,
      MedicalRecord: medicalRecord.address
    }
  };

  const fileContent = `window.BLOCKCHAIN_CONFIG = ${JSON.stringify(config, null, 2)};\nwindow.CONTRACT_ADDRESSES = window.BLOCKCHAIN_CONFIG.contracts;\n`;
  fs.writeFileSync(frontendConfigPath, fileContent, "utf8");

  // eslint-disable-next-line no-console
  console.log(`Contract addresses saved to ${frontendConfigPath}`);
};
