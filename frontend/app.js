/* global Web3 */

const HealthcareDApp = {
  state: {
    web3: null,
    account: null,
    networkId: null,
    contracts: {},
    artifacts: {},
    page: null
  },

  contractNames: ["Hospital", "Doctor", "Patient", "MedicalRecord"],

  async init() {
    this.state.page = document.body.dataset.page || "index";
    this.injectSpinner();
    this.bindCommonEvents();
    this.setDefaultDates();

    if (!window.ethereum) {
      this.updateNetworkConnectionState(false);
      this.setStatus("MetaMask not detected. Install MetaMask to continue.", "error");
      window.alert("MetaMask was not detected. Please install MetaMask and refresh this page.");
      return;
    }

    window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on("chainChanged", () => window.location.reload());

    await this.autoConnectWallet();
  },

  bindCommonEvents() {
    const connectBtn = this.$("connectWalletBtn");
    if (connectBtn) {
      connectBtn.addEventListener("click", () => this.connectWallet(true));
    }
  },

  setDefaultDates() {
    const today = new Date().toISOString().split("T")[0];

    const patientDate = this.$("patientDate");
    if (patientDate && !patientDate.value) {
      patientDate.value = today;
    }

    const treatmentDate = this.$("treatmentDate");
    if (treatmentDate && !treatmentDate.value) {
      treatmentDate.value = today;
    }
  },

  async autoConnectWallet() {
    try {
      this.state.web3 = new Web3(window.ethereum);
      const accounts = await window.ethereum.request({ method: "eth_accounts" });

      if (accounts && accounts.length) {
        await this.connectWallet(false);
      } else {
        this.updateNetworkConnectionState(false);
        this.setStatus("Wallet not connected. Click Connect MetaMask.", "info");
      }
    } catch (error) {
      this.handleError("Auto wallet connection failed", error);
    }
  },

  async connectWallet(forcePrompt) {
    try {
      this.state.web3 = this.state.web3 || new Web3(window.ethereum);
      const method = forcePrompt ? "eth_requestAccounts" : "eth_accounts";
      const accounts = await window.ethereum.request({ method });

      if (!accounts || !accounts.length) {
        this.updateNetworkConnectionState(false);
        this.setStatus("No wallet account available.", "error");
        return;
      }

      this.state.account = accounts[0];
      this.state.networkId = Number(await this.state.web3.eth.net.getId());

      this.updateWalletUi();
      this.updateNetworkConnectionState(true);

      await this.loadAllContracts();
      await this.routePage();

      this.setStatus("Wallet connected and contracts loaded.", "success");
    } catch (error) {
      this.handleError("Wallet connection failed", error);
    }
  },

  async loadAllContracts() {
    for (const contractName of this.contractNames) {
      const response = await fetch(`../build/contracts/${contractName}.json`);
      if (!response.ok) {
        throw new Error(`Unable to load ABI for ${contractName}. Run npm run compile first.`);
      }

      const artifact = await response.json();
      this.state.artifacts[contractName] = artifact;

      const configuredAddress =
        window.BLOCKCHAIN_CONFIG?.contracts?.[contractName] ||
        window.CONTRACT_ADDRESSES?.[contractName];

      const networkAddress = artifact?.networks?.[this.state.networkId]?.address;
      const selectedAddress = configuredAddress || networkAddress;

      if (!selectedAddress) {
        throw new Error(`No address configured for ${contractName}. Run npm run migrate.`);
      }

      this.state.contracts[contractName] = new this.state.web3.eth.Contract(
        artifact.abi,
        selectedAddress
      );
    }
  },

  async routePage() {
    if (this.state.page === "hospital") {
      await this.initHospitalPage();
      return;
    }

    if (this.state.page === "doctor") {
      await this.initDoctorPage();
      return;
    }

    if (this.state.page === "patient") {
      await this.initPatientPage();
      return;
    }

    if (this.state.page === "dashboard") {
      await this.initDashboardPage();
      return;
    }

    if (this.state.page === "record") {
      await this.initRecordPage();
      return;
    }

    this.setStatus("Connected. Choose a portal to continue.", "success");
  },

  // ---------------------------
  // Hospital Contract Functions
  // ---------------------------

  async initHospitalPage() {
    const form = this.$("hospitalRegisterForm");
    const refreshBtn = this.$("loadHospitalsBtn");

    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.hospitalRegister();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.hospitalLoadAll());
    }

    await this.hospitalLoadAll();
  },

  async hospitalRegister() {
    const hospitalId = this.toInt(this.value("hospitalId"));
    const name = this.value("hospitalName").trim();
    const hospitalAddress = this.value("hospitalAddress").trim();
    const specialisation = this.value("hospitalSpecialisation").trim();

    if (!hospitalId || !name || !hospitalAddress || !specialisation) {
      this.userAlert("Please fill all required hospital fields.");
      return;
    }

    await this.runWrite(
      "Register Hospital",
      () =>
        this.state.contracts.Hospital.methods
          .registerHospital(hospitalId, name, hospitalAddress, specialisation)
          .send({ from: this.state.account })
    );

    await this.hospitalLoadAll();
  },

  async hospitalLoadAll() {
    const body = this.$("hospitalsTableBody");
    if (!body) {
      return;
    }

    try {
      const hospitals = await this.state.contracts.Hospital.methods.getAllHospitals().call();

      if (!hospitals.length) {
        body.innerHTML = "<tr><td colspan='4'>No hospitals registered yet.</td></tr>";
        return;
      }

      body.innerHTML = hospitals
        .filter((h) => h.exists)
        .map(
          (h) => `
            <tr>
              <td>${this.escape(h.hospitalId)}</td>
              <td>${this.escape(h.name)}</td>
              <td>${this.escape(h.hospitalAddress)}</td>
              <td>${this.escape(h.specialisation)}</td>
            </tr>
          `
        )
        .join("");
    } catch (error) {
      body.innerHTML = `<tr><td colspan='4'>${this.escape(this.friendlyError(error))}</td></tr>`;
    }
  },

  // ------------------------
  // Doctor Contract Functions
  // ------------------------

  async initDoctorPage() {
    const registerForm = this.$("doctorRegisterForm");
    const lookupForm = this.$("doctorLookupForm");
    const doctorsByHospitalForm = this.$("doctorsByHospitalForm");

    const walletInput = this.$("doctorWallet");
    if (walletInput && !walletInput.value) {
      walletInput.value = this.state.account;
    }

    if (registerForm) {
      registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.doctorRegister();
      });
    }

    if (lookupForm) {
      lookupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.doctorGetDetails();
      });
    }

    if (doctorsByHospitalForm) {
      doctorsByHospitalForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.doctorListByHospital();
      });
    }

    await this.loadHospitalDropdowns(["doctorHospitalId", "doctorsHospitalId"]);
    await this.refreshDoctorIdentityWidgets();
  },

  async doctorRegister() {
    const doctorId = this.toInt(this.value("doctorId"));
    const name = this.value("doctorName").trim();
    const specialisation = this.value("doctorSpecialisation").trim();
    const phone = this.value("doctorPhone").trim();
    const doctorAddress = this.value("doctorAddress").trim();
    const hospitalId = this.toInt(this.value("doctorHospitalId"));
    const doctorWallet = this.value("doctorWallet").trim();

    if (!doctorId || !name || !specialisation || !phone || !doctorAddress || !hospitalId || !doctorWallet) {
      this.userAlert("Please fill all doctor registration fields.");
      return;
    }

    if (!this.state.web3.utils.isAddress(doctorWallet)) {
      this.userAlert("Please enter a valid doctor wallet address.");
      return;
    }

    await this.runWrite(
      "Register Doctor",
      () =>
        this.state.contracts.Doctor.methods
          .registerDoctor(
            doctorId,
            name,
            specialisation,
            phone,
            doctorAddress,
            hospitalId,
            doctorWallet
          )
          .send({ from: this.state.account })
    );

    await this.refreshDoctorIdentityWidgets();
  },

  async doctorGetDetails() {
    const doctorId = this.toInt(this.value("doctorLookupId"));
    const box = this.$("doctorLookupResult");

    if (!doctorId) {
      this.userAlert("Enter a valid doctor ID.");
      return;
    }

    if (!box) {
      return;
    }

    try {
      const d = await this.state.contracts.Doctor.methods.getDoctorDetails(doctorId).call();
      box.innerHTML = `
        <strong>Doctor ID:</strong> ${this.escape(d.doctorId)}<br />
        <strong>Name:</strong> ${this.escape(d.name)}<br />
        <strong>Specialisation:</strong> ${this.escape(d.specialisation)}<br />
        <strong>Phone:</strong> ${this.escape(d.phone)}<br />
        <strong>Address:</strong> ${this.escape(d.doctorAddress)}<br />
        <strong>Hospital ID:</strong> ${this.escape(d.hospitalId)}<br />
        <strong>Wallet:</strong> <span class="mono">${this.escape(d.wallet)}</span>
      `;
    } catch (error) {
      box.innerHTML = this.escape(this.friendlyError(error));
    }
  },

  async doctorListByHospital() {
    const hospitalId = this.toInt(this.value("doctorsHospitalId"));
    const body = this.$("doctorsByHospitalBody");

    if (!hospitalId) {
      this.userAlert("Please select a hospital to list doctors.");
      return;
    }

    if (!body) {
      return;
    }

    try {
      const doctors = await this.state.contracts.Doctor.methods.getDoctorsByHospital(hospitalId).call();

      if (!doctors.length) {
        body.innerHTML = "<tr><td colspan='6'>No doctors found for this hospital.</td></tr>";
        return;
      }

      body.innerHTML = doctors
        .filter((d) => d.exists)
        .map(
          (d) => `
            <tr>
              <td>${this.escape(d.doctorId)}</td>
              <td>${this.escape(d.name)}</td>
              <td>${this.escape(d.specialisation)}</td>
              <td>${this.escape(d.phone)}</td>
              <td>${this.escape(d.doctorAddress)}</td>
              <td class="mono">${this.escape(d.wallet)}</td>
            </tr>
          `
        )
        .join("");
    } catch (error) {
      body.innerHTML = `<tr><td colspan='6'>${this.escape(this.friendlyError(error))}</td></tr>`;
    }
  },

  async refreshDoctorIdentityWidgets() {
    const idLabel = this.$("currentDoctorId");
    const hospitalLabel = this.$("currentDoctorHospital");

    try {
      const doctorId = await this.state.contracts.Doctor.methods
        .getDoctorIdByWallet(this.state.account)
        .call();

      if (!doctorId || doctorId === "0") {
        if (idLabel) idLabel.textContent = "Not registered";
        if (hospitalLabel) hospitalLabel.textContent = "-";
        return;
      }

      const details = await this.state.contracts.Doctor.methods.getDoctorDetails(doctorId).call();
      if (idLabel) idLabel.textContent = details.doctorId;
      if (hospitalLabel) hospitalLabel.textContent = details.hospitalId;
    } catch {
      if (idLabel) idLabel.textContent = "-";
      if (hospitalLabel) hospitalLabel.textContent = "-";
    }
  },

  // ------------------------
  // Patient Contract Functions
  // ------------------------

  async initPatientPage() {
    const registerForm = this.$("patientRegisterForm");
    const lookupForm = this.$("patientLookupForm");

    if (registerForm) {
      registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.patientRegister();
      });
    }

    if (lookupForm) {
      lookupForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.patientLookupById();
      });
    }
  },

  async patientRegister() {
    const payload = {
      patientId: this.toInt(this.value("patientId")),
      name: this.value("patientName").trim(),
      age: this.toInt(this.value("patientAge")),
      gender: this.value("patientGender").trim(),
      height: this.value("patientHeight").trim(),
      weight: this.value("patientWeight").trim(),
      homeAddress: this.value("patientAddress").trim(),
      phone: this.value("patientPhone").trim(),
      email: this.value("patientEmail").trim(),
      date: this.value("patientDate").trim(),
      attendantName: this.value("attendantName").trim(),
      attendantRelation: this.value("attendantRelation").trim(),
      attendantPhone: this.value("attendantPhone").trim()
    };

    if (
      !payload.patientId ||
      !payload.name ||
      !payload.age ||
      !payload.gender ||
      !payload.height ||
      !payload.weight ||
      !payload.homeAddress ||
      !payload.phone ||
      !payload.email ||
      !payload.date ||
      !payload.attendantName ||
      !payload.attendantRelation ||
      !payload.attendantPhone
    ) {
      this.userAlert("Please complete all patient and attendant fields.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
      this.userAlert("Please enter a valid patient email address.");
      return;
    }

    await this.runWrite(
      "Register Patient",
      () =>
        this.state.contracts.Patient.methods
          .registerPatient(
            payload.patientId,
            payload.name,
            payload.age,
            payload.gender,
            payload.height,
            payload.weight,
            payload.homeAddress,
            payload.phone,
            payload.email,
            payload.date,
            payload.attendantName,
            payload.attendantRelation,
            payload.attendantPhone
          )
          .send({ from: this.state.account })
    );
  },

  async patientLookupById() {
    const patientId = this.toInt(this.value("viewPatientId"));
    const box = this.$("patientLookupResult");

    if (!patientId) {
      this.userAlert("Enter a valid patient ID.");
      return;
    }

    if (!box) {
      return;
    }

    try {
      const p = await this.state.contracts.Patient.methods
        .getPatientDetails(patientId)
        .call({ from: this.state.account });

      box.innerHTML = `
        <strong>Patient ID:</strong> ${this.escape(p.patientId)}<br />
        <strong>Name:</strong> ${this.escape(p.name)}<br />
        <strong>Age / Gender:</strong> ${this.escape(p.age)} / ${this.escape(p.gender)}<br />
        <strong>Height / Weight:</strong> ${this.escape(p.height)} / ${this.escape(p.weight)}<br />
        <strong>Address:</strong> ${this.escape(p.homeAddress)}<br />
        <strong>Phone:</strong> ${this.escape(p.phone)}<br />
        <strong>Email:</strong> ${this.escape(p.email)}<br />
        <strong>Date:</strong> ${this.escape(p.date)}<br />
        <strong>Attendant:</strong> ${this.escape(p.attendantName)} (${this.escape(p.attendantRelation)}) - ${this.escape(p.attendantPhone)}
      `;
    } catch (error) {
      box.textContent = this.friendlyError(error);
    }
  },

  // -------------------------------
  // Dashboard + Access Control Logic
  // -------------------------------

  async initDashboardPage() {
    const refreshBtn = this.$("refreshDashboardBtn");
    const grantForm = this.$("dashboardGrantForm");

    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.dashboardLoad());
    }

    if (grantForm) {
      grantForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.dashboardGrantAccess();
      });
    }

    await this.dashboardLoad();
  },

  async dashboardLoad() {
    try {
      const patientId = await this.getCurrentPatientIdForWallet();
      if (!patientId) {
        this.setStatus("No patient is mapped to this wallet. Register patient details first.", "error");
        return;
      }

      const idLabel = this.$("dashboardPatientId");
      if (idLabel) {
        idLabel.textContent = patientId;
      }

      await this.dashboardLoadProfile(patientId);
      await this.dashboardLoadHistory(patientId);
      await this.dashboardLoadAccessDoctors(patientId);
      await this.dashboardLoadAccessLog(patientId);

      this.setStatus("Dashboard updated successfully.", "success");
    } catch (error) {
      this.handleError("Dashboard load failed", error);
    }
  },

  async dashboardLoadProfile(patientId) {
    const container = this.$("patientOverview");
    if (!container) {
      return;
    }

    const p = await this.state.contracts.Patient.methods
      .getPatientDetails(patientId)
      .call({ from: this.state.account });

    container.innerHTML = `
      <div><strong>Name:</strong> ${this.escape(p.name)}</div>
      <div><strong>Age / Gender:</strong> ${this.escape(p.age)} / ${this.escape(p.gender)}</div>
      <div><strong>Height / Weight:</strong> ${this.escape(p.height)} / ${this.escape(p.weight)}</div>
      <div><strong>Address:</strong> ${this.escape(p.homeAddress)}</div>
      <div><strong>Phone / Email:</strong> ${this.escape(p.phone)} / ${this.escape(p.email)}</div>
      <div><strong>Date:</strong> ${this.escape(p.date)}</div>
      <div><strong>Attendant:</strong> ${this.escape(p.attendantName)} (${this.escape(p.attendantRelation)}) - ${this.escape(p.attendantPhone)}</div>
    `;
  },

  async dashboardLoadHistory(patientId) {
    const body = this.$("dashboardHistoryBody");
    const meds = this.$("dashboardMedicationList");

    if (!body || !meds) {
      return;
    }

    try {
      await this.runWrite(
        "Log Record View",
        () =>
          this.state.contracts.MedicalRecord.methods
            .logPatientRecordsView(patientId)
            .send({ from: this.state.account }),
        { alertOnSuccess: false }
      );
    } catch {
      // Continue loading history even if user cancels log transaction.
    }

    try {
      const recordIds = await this.state.contracts.MedicalRecord.methods
        .getRecordsByPatient(patientId)
        .call({ from: this.state.account });

      if (!recordIds.length) {
        body.innerHTML = "<tr><td colspan='7'>No records found.</td></tr>";
        meds.innerHTML = "<li>No current medications.</li>";
        return;
      }

      const medicationSet = new Set();
      const rows = [];

      for (const id of recordIds) {
        const record = await this.state.contracts.MedicalRecord.methods
          .getRecord(id)
          .call({ from: this.state.account });

        if (record?.diagnosis?.prescription) {
          medicationSet.add(record.diagnosis.prescription);
        }

        rows.push(`
          <tr>
            <td>${this.escape(record.recordId)}</td>
            <td>${this.escape(record.doctorId)}</td>
            <td>${this.escape(record.hospitalId)}</td>
            <td>${this.escape(record.diagnosis.summary)}</td>
            <td>${this.escape(record.diagnosis.prescription)}</td>
            <td>${this.escape(record.treatment.treatment)}</td>
            <td>${this.escape(record.treatment.date)}</td>
          </tr>
        `);
      }

      body.innerHTML = rows.join("");
      meds.innerHTML =
        medicationSet.size > 0
          ? [...medicationSet].map((m) => `<li>${this.escape(m)}</li>`).join("")
          : "<li>No current medications.</li>";
    } catch (error) {
      body.innerHTML = `<tr><td colspan='7'>${this.escape(this.friendlyError(error))}</td></tr>`;
      meds.innerHTML = "<li>Unable to load medications.</li>";
    }
  },

  async dashboardLoadAccessDoctors(patientId) {
    const body = this.$("accessDoctorsBody");
    if (!body) {
      return;
    }

    try {
      const doctorIds = await this.state.contracts.Patient.methods
        .getDoctorsWithAccess(patientId)
        .call({ from: this.state.account });

      if (!doctorIds.length) {
        body.innerHTML = "<tr><td colspan='5'>No doctors currently have access.</td></tr>";
        return;
      }

      const rows = [];
      for (const doctorId of doctorIds) {
        const d = await this.state.contracts.Doctor.methods.getDoctorDetails(doctorId).call();
        rows.push(`
          <tr>
            <td>${this.escape(d.doctorId)}</td>
            <td>${this.escape(d.name)}</td>
            <td>${this.escape(d.specialisation)}</td>
            <td>${this.escape(d.hospitalId)}</td>
            <td><button type="button" class="revoke-btn" data-doctor-id="${this.escape(d.doctorId)}">Revoke</button></td>
          </tr>
        `);
      }

      body.innerHTML = rows.join("");

      body.querySelectorAll(".revoke-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const doctorId = this.toInt(btn.dataset.doctorId);
          await this.dashboardRevokeAccess(doctorId);
        });
      });
    } catch (error) {
      body.innerHTML = `<tr><td colspan='5'>${this.escape(this.friendlyError(error))}</td></tr>`;
    }
  },

  async dashboardGrantAccess() {
    const doctorId = this.toInt(this.value("grantDoctorId"));
    const patientId = await this.getCurrentPatientIdForWallet();

    if (!patientId) {
      this.userAlert("No patient profile linked to this wallet.");
      return;
    }

    if (!doctorId) {
      this.userAlert("Enter a valid doctor ID to grant access.");
      return;
    }

    await this.runWrite(
      "Grant Access",
      () =>
        this.state.contracts.Patient.methods
          .grantAccess(patientId, doctorId)
          .send({ from: this.state.account })
    );

    await this.dashboardLoad();
  },

  async dashboardRevokeAccess(doctorId) {
    const patientId = await this.getCurrentPatientIdForWallet();
    if (!patientId) {
      this.userAlert("No patient profile linked to this wallet.");
      return;
    }

    await this.runWrite(
      "Revoke Access",
      () =>
        this.state.contracts.Patient.methods
          .revokeAccess(patientId, doctorId)
          .send({ from: this.state.account })
    );

    await this.dashboardLoad();
  },

  async dashboardLoadAccessLog(patientId) {
    const body = this.$("dashboardAccessLogBody");
    if (!body) {
      return;
    }

    try {
      const logs = await this.state.contracts.MedicalRecord.methods
        .getAccessLog(patientId)
        .call({ from: this.state.account });

      if (!logs.length) {
        body.innerHTML = "<tr><td colspan='5'>No access logs found.</td></tr>";
        return;
      }

      logs.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

      body.innerHTML = logs
        .map(
          (log) => `
            <tr>
              <td class="mono">${this.escape(log.viewedBy)}</td>
              <td>${this.escape(log.doctorId)}</td>
              <td>${this.escape(log.hospitalId)}</td>
              <td>${this.escape(log.action)}</td>
              <td>${this.escape(this.formatTimestamp(log.timestamp))}</td>
            </tr>
          `
        )
        .join("");
    } catch (error) {
      body.innerHTML = `<tr><td colspan='5'>${this.escape(this.friendlyError(error))}</td></tr>`;
    }
  },

  async getCurrentPatientIdForWallet() {
    const id = await this.state.contracts.Patient.methods
      .patientIdByWallet(this.state.account)
      .call();
    return id && id !== "0" ? id : null;
  },

  // ------------------------
  // Medical Record Functions
  // ------------------------

  async initRecordPage() {
    const searchBtn = this.$("searchPatientBtn");
    const form = this.$("addRecordForm");

    if (searchBtn) {
      searchBtn.addEventListener("click", () => this.recordSearchPatientAndLoadHistory());
    }

    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.recordAddNew();
      });
    }

    await this.recordRefreshDoctorIdentity();
  },

  async recordRefreshDoctorIdentity() {
    const doctorIdLabel = this.$("recordDoctorId");
    const hospitalLabel = this.$("doctorHospitalBadge");
    const doctorIdInput = this.$("recordDoctorIdInput");
    const hospitalInput = this.$("recordHospitalId");

    try {
      const doctorId = await this.state.contracts.Doctor.methods
        .getDoctorIdByWallet(this.state.account)
        .call();

      if (!doctorId || doctorId === "0") {
        if (doctorIdLabel) doctorIdLabel.textContent = "Not registered";
        if (hospitalLabel) hospitalLabel.textContent = "-";
        return;
      }

      const details = await this.state.contracts.Doctor.methods.getDoctorDetails(doctorId).call();

      if (doctorIdLabel) doctorIdLabel.textContent = details.doctorId;
      if (hospitalLabel) hospitalLabel.textContent = details.hospitalId;
      if (doctorIdInput) doctorIdInput.value = details.doctorId;
      if (hospitalInput && !hospitalInput.value) hospitalInput.value = details.hospitalId;
    } catch {
      if (doctorIdLabel) doctorIdLabel.textContent = "-";
      if (hospitalLabel) hospitalLabel.textContent = "-";
    }
  },

  async recordSearchPatientAndLoadHistory() {
    const patientId = this.toInt(this.value("doctorPatientId"));
    const detailsBox = this.$("recordPatientDetails");
    const resultsBox = this.$("recordResults");

    if (!patientId) {
      this.userAlert("Enter a valid patient ID.");
      return;
    }

    const patientIdInput = this.$("recordPatientId");
    if (patientIdInput) {
      patientIdInput.value = patientId;
    }

    if (detailsBox) {
      try {
        const p = await this.state.contracts.Patient.methods
          .getPatientDetails(patientId)
          .call({ from: this.state.account });

        detailsBox.innerHTML = `
          <strong>Patient ID:</strong> ${this.escape(p.patientId)}<br />
          <strong>Name:</strong> ${this.escape(p.name)}<br />
          <strong>Age / Gender:</strong> ${this.escape(p.age)} / ${this.escape(p.gender)}<br />
          <strong>Height / Weight:</strong> ${this.escape(p.height)} / ${this.escape(p.weight)}<br />
          <strong>Phone:</strong> ${this.escape(p.phone)}<br />
          <strong>Email:</strong> ${this.escape(p.email)}<br />
          <strong>Attendant:</strong> ${this.escape(p.attendantName)} (${this.escape(p.attendantRelation)})
        `;
      } catch (error) {
        detailsBox.textContent = this.friendlyError(error);
      }
    }

    try {
      await this.runWrite(
        "Log Record View",
        () =>
          this.state.contracts.MedicalRecord.methods
            .logPatientRecordsView(patientId)
            .send({ from: this.state.account }),
        { alertOnSuccess: false }
      );
    } catch {
      // Continue to fetch records if logging tx was cancelled.
    }

    if (!resultsBox) {
      return;
    }

    try {
      const recordIds = await this.state.contracts.MedicalRecord.methods
        .getRecordsByPatient(patientId)
        .call({ from: this.state.account });

      if (!recordIds.length) {
        resultsBox.innerHTML = "<div class='record-card'>No records found for this patient.</div>";
        return;
      }

      const cards = [];
      for (const recordId of recordIds) {
        const record = await this.state.contracts.MedicalRecord.methods
          .getRecord(recordId)
          .call({ from: this.state.account });

        cards.push(`
          <div class="record-card">
            <strong>Record ID:</strong> ${this.escape(record.recordId)}<br />
            <strong>Timestamp:</strong> ${this.escape(this.formatTimestamp(record.timestamp))}<br />
            <strong>Doctor ID / Hospital ID:</strong> ${this.escape(record.doctorId)} / ${this.escape(record.hospitalId)}<br />
            <strong>Complaints:</strong> ${this.escape(record.presentIllness.complaints)} (${this.escape(record.presentIllness.duration)})<br />
            <strong>Diagnosis:</strong> ${this.escape(record.diagnosis.summary)}<br />
            <strong>Prescription:</strong> ${this.escape(record.diagnosis.prescription)}<br />
            <strong>Treatment:</strong> ${this.escape(record.treatment.treatment)}<br />
            <strong>Follow-up:</strong> ${this.escape(record.treatment.followup)}
          </div>
        `);
      }

      resultsBox.innerHTML = cards.join("");
    } catch (error) {
      resultsBox.innerHTML = `<div class='record-card'>${this.escape(this.friendlyError(error))}</div>`;
    }
  },

  async recordAddNew() {
    const recordId = this.toInt(this.value("recordId"));
    const patientId = this.toInt(this.value("recordPatientId"));
    const doctorId = this.toInt(this.value("recordDoctorIdInput"));
    const hospitalId = this.toInt(this.value("recordHospitalId"));

    if (!recordId || !patientId || !doctorId || !hospitalId) {
      this.userAlert("Record ID, Patient ID, Doctor ID, and Hospital ID are required.");
      return;
    }

    const recordInput = {
      recordId,
      patientId,
      doctorId,
      hospitalId,
      presentIllness: {
        complaints: this.value("complaints").trim(),
        duration: this.value("duration").trim()
      },
      pastHistory: {
        familyHistory: this.value("familyHistory").trim(),
        personalHistory: this.value("personalHistory").trim(),
        drugHistory: this.value("drugHistory").trim()
      },
      diagnosis: {
        summary: this.value("diagnosisSummary").trim(),
        prescription: this.value("prescription").trim()
      },
      treatment: {
        treatment: this.value("treatment").trim(),
        date: this.value("treatmentDate").trim(),
        doctorId,
        hospitalId,
        discharge: this.value("discharge").trim(),
        followup: this.value("followup").trim()
      },
      investigations: {
        blood: this.value("blood").trim(),
        urine: this.value("urine").trim(),
        ecg: this.value("ecg").trim(),
        mri: this.value("mri").trim(),
        ct: this.value("ct").trim(),
        xray: this.value("xray").trim()
      },
      insurance: {
        applicable: this.value("insuranceApplicable") === "true",
        policyNumber: this.value("policyNumber").trim(),
        insurer: this.value("insurer").trim(),
        insuranceType: this.value("insuranceType").trim(),
        coverageLimit: this.value("coverageLimit").trim()
      }
    };

    if (
      !recordInput.presentIllness.complaints ||
      !recordInput.presentIllness.duration ||
      !recordInput.pastHistory.familyHistory ||
      !recordInput.pastHistory.personalHistory ||
      !recordInput.pastHistory.drugHistory ||
      !recordInput.diagnosis.summary ||
      !recordInput.diagnosis.prescription ||
      !recordInput.treatment.treatment ||
      !recordInput.treatment.date ||
      !recordInput.treatment.discharge ||
      !recordInput.treatment.followup
    ) {
      this.userAlert("Please complete all mandatory medical record fields.");
      return;
    }

    await this.runWrite(
      "Add Medical Record",
      () =>
        this.state.contracts.MedicalRecord.methods
          .addRecord(recordInput)
          .send({ from: this.state.account })
    );

    await this.recordSearchPatientAndLoadHistory();
  },

  // ------------------------
  // Shared Utilities
  // ------------------------

  async loadHospitalDropdowns(selectIds) {
    try {
      const hospitals = await this.state.contracts.Hospital.methods.getAllHospitals().call();
      const options = hospitals
        .filter((h) => h.exists)
        .map((h) => `<option value="${this.escape(h.hospitalId)}">${this.escape(h.hospitalId)} - ${this.escape(h.name)}</option>`)
        .join("");

      selectIds.forEach((id) => {
        const select = this.$(id);
        if (!select) return;
        const firstOption = "<option value=''>Select hospital</option>";
        select.innerHTML = firstOption + options;
      });
    } catch {
      // Dropdown population failure is non-fatal here.
    }
  },

  updateWalletUi() {
    const walletAddress = this.$("walletAddress");
    const networkName = this.$("networkName");

    if (walletAddress) {
      walletAddress.textContent = this.state.account || "Not connected";
    }

    if (networkName) {
      networkName.textContent = this.describeNetwork(this.state.networkId);
    }
  },

  updateNetworkConnectionState(isConnected) {
    const status = this.$("networkConnectionStatus");
    const dot = this.$("networkStatusDot");

    if (status) {
      status.textContent = isConnected ? "Connected" : "Disconnected";
    }

    if (dot) {
      dot.classList.toggle("connected", Boolean(isConnected));
    }
  },

  describeNetwork(networkId) {
    if (networkId === 1337 || networkId === 5777) {
      return `Ganache Local (${networkId})`;
    }
    return networkId ? `Chain ID ${networkId}` : "-";
  },

  async runWrite(actionLabel, sendFn, options = {}) {
    const alertOnSuccess = options.alertOnSuccess !== false;

    try {
      this.setLoading(true, `${actionLabel}... waiting for MetaMask confirmation.`);
      this.setStatus(`${actionLabel} in progress...`, "info");

      const receipt = await sendFn();
      const txHash = receipt?.transactionHash || "N/A";

      this.setStatus(`${actionLabel} successful. Tx: ${txHash}`, "success");
      if (alertOnSuccess) {
        this.userAlert(`${actionLabel} successful.\nTransaction Hash:\n${txHash}`);
      }

      return receipt;
    } catch (error) {
      const friendly = this.friendlyError(error);
      this.setStatus(`${actionLabel} failed: ${friendly}`, "error");
      this.userAlert(`${actionLabel} failed:\n${friendly}`);
      throw error;
    } finally {
      this.setLoading(false);
    }
  },

  handleError(context, error) {
    const message = this.friendlyError(error);
    this.setStatus(`${context}: ${message}`, "error");
    this.userAlert(`${context}:\n${message}`);
  },

  setStatus(message, type = "info") {
    const box = this.$("statusBox");
    if (!box) {
      return;
    }

    const palette = {
      info: "#9ab0bb",
      success: "#3ddc97",
      error: "#ff7b8a"
    };

    box.style.color = palette[type] || palette.info;
    box.textContent = message;
  },

  injectSpinner() {
    if (this.$("txSpinnerOverlay")) {
      return;
    }

    const style = document.createElement("style");
    style.textContent = `
      #txSpinnerOverlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      #txSpinnerOverlay .tx-box {
        min-width: 280px;
        max-width: 440px;
        background: #101418;
        border: 1px solid #1e3642;
        border-radius: 12px;
        padding: 18px;
        color: #e8f8ff;
        text-align: center;
      }
      #txSpinnerOverlay .spinner {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 4px solid #163540;
        border-top-color: #00d4ff;
        margin: 0 auto 12px;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      #txSpinnerMessage {
        font-size: 0.92rem;
        color: #9ab0bb;
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "txSpinnerOverlay";
    overlay.innerHTML = `
      <div class="tx-box">
        <div class="spinner"></div>
        <div id="txSpinnerMessage">Processing blockchain transaction...</div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  setLoading(isLoading, message = "Processing blockchain transaction...") {
    const overlay = this.$("txSpinnerOverlay");
    const messageNode = this.$("txSpinnerMessage");
    if (!overlay || !messageNode) {
      return;
    }

    messageNode.textContent = message;
    overlay.style.display = isLoading ? "flex" : "none";
  },

  friendlyError(error) {
    const raw =
      error?.data?.message ||
      error?.reason ||
      error?.message ||
      "Unknown blockchain error";

    if (/User denied|User rejected/i.test(raw)) {
      return "Transaction cancelled in MetaMask.";
    }

    if (/revert/i.test(raw)) {
      return raw.replace(/^.*revert\s*/i, "").trim() || "Smart contract reverted the transaction.";
    }

    return raw;
  },

  formatTimestamp(unixSeconds) {
    const asNumber = Number(unixSeconds);
    if (!asNumber) {
      return "-";
    }
    return new Date(asNumber * 1000).toLocaleString();
  },

  userAlert(message) {
    window.alert(message);
  },

  value(id) {
    const node = this.$(id);
    return node ? node.value : "";
  },

  toInt(value) {
    if (value === null || value === undefined || value === "") {
      return 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
  },

  escape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  },

  $(id) {
    return document.getElementById(id);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  HealthcareDApp.init();
});
