# Healthcare Blockchain System

A blockchain-based healthcare data security system built with **Solidity**, **Truffle**, **Ganache**, **Web3.js**, and a pure **HTML/CSS/JavaScript** frontend.

This project enables:
- Hospital registration (owner-controlled)
- Doctor registration under hospitals
- Patient registration with attendant details
- Patient-controlled doctor access (grant/revoke)
- Medical record creation and retrieval with on-chain access logs
- Demo data seeding for hospitals and patients

---

## Tech Stack

- **Smart Contracts:** Solidity `^0.8.19`
- **Framework:** Truffle
- **Local Blockchain:** Ganache (`127.0.0.1:7545`, chain ID `1337`)
- **Frontend:** Vanilla HTML/CSS/JavaScript + Web3.js
- **Wallet:** MetaMask

---

## Project Structure

- `contracts/` — Solidity contracts (`Hospital.sol`, `Doctor.sol`, `Patient.sol`, `MedicalRecord.sol`)
- `migrations/` — Truffle deployment scripts
- `frontend/` — UI pages and Web3 app logic
- `scripts/` — seed scripts (`seedData.js`, `seed_demo_data.js`)
- `build/contracts/` — compiled ABI artifacts

---

## Prerequisites

- Node.js (LTS recommended)
- Ganache running locally on port `7545`
- MetaMask browser extension

---

## Setup and Run

1. Install dependencies
2. Compile contracts
3. Deploy contracts to Ganache
4. Seed data (optional, but recommended)
5. Start frontend server

### NPM scripts available

- `npm run compile` — compile contracts
- `npm run migrate` — deploy/redeploy contracts and auto-update `frontend/config.js`
- `npm run seed:demo` — seed demo hospitals/doctors/patients via Truffle exec
- `npm run start` — run lite-server

### Seed script options

- `node scripts/seedData.js` → seeds **10 hospitals + 10 patients** (from prompt requirements)
- `npm run seed:demo` (uses `scripts/seed_demo_data.js`) → seeds broader demo dataset

---

## Frontend URLs

When lite-server is running:

- `http://localhost:3000/frontend/index.html`
- `http://localhost:3000/frontend/hospital.html`
- `http://localhost:3000/frontend/doctor.html`
- `http://localhost:3000/frontend/patient.html`
- `http://localhost:3000/frontend/dashboard.html`
- `http://localhost:3000/frontend/record.html`

---

## MetaMask Notes

- Ensure MetaMask is installed and enabled for localhost.
- Add/select Ganache network:
  - RPC URL: `http://127.0.0.1:7545`
  - Chain ID: `1337`
  - Currency Symbol: `ETH`
- Import a Ganache account private key if needed.

---

## Contract Address Auto-Update

After each migration, `migrations/2_deploy_contracts.js` automatically writes latest deployed addresses and network metadata into:

- `frontend/config.js`

So frontend always points to current local deployment.

---

## Common Troubleshooting

- **MetaMask not detected:**
  - Use an external browser (not embedded webviews)
  - Enable extension site access for localhost
- **Connection not open on send():**
  - Ganache is not running on `127.0.0.1:7545`
- **Missing contract address in frontend:**
  - Run migration again to regenerate `frontend/config.js`

---

## License

See `LICENSE`.
