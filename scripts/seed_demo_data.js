const Hospital = artifacts.require("Hospital");
const Doctor = artifacts.require("Doctor");
const Patient = artifacts.require("Patient");

const hospitals = [
  { id: 1, name: "AIIMS New Delhi", address: "Ansari Nagar, New Delhi", specialisation: "Multispeciality" },
  { id: 2, name: "Apollo Hospitals Chennai", address: "Greams Road, Chennai", specialisation: "Cardiology" },
  { id: 3, name: "Fortis Memorial Research Institute", address: "Sector 44, Gurugram", specialisation: "Oncology" },
  { id: 4, name: "Manipal Hospitals Bengaluru", address: "Old Airport Road, Bengaluru", specialisation: "Neurology" },
  { id: 5, name: "Narayana Health City", address: "Bommasandra, Bengaluru", specialisation: "Cardiac Sciences" },
  { id: 6, name: "Kokilaben Dhirubhai Ambani Hospital", address: "Andheri West, Mumbai", specialisation: "Neurosciences" },
  { id: 7, name: "Tata Memorial Hospital", address: "Parel, Mumbai", specialisation: "Cancer Care" },
  { id: 8, name: "Christian Medical College", address: "Ida Scudder Road, Vellore", specialisation: "General Medicine" },
  { id: 9, name: "Medanta The Medicity", address: "Sector 38, Gurugram", specialisation: "Gastroenterology" },
  { id: 10, name: "PGIMER Chandigarh", address: "Sector 12, Chandigarh", specialisation: "Research and Tertiary Care" }
];

const doctors = [
  {
    id: 1001,
    name: "Dr. Arjun Mehta",
    specialisation: "Cardiology",
    phone: "+91-9810010001",
    address: "New Delhi",
    hospitalId: 1
  },
  {
    id: 1002,
    name: "Dr. Priya Nair",
    specialisation: "Neurology",
    phone: "+91-9810010002",
    address: "Chennai",
    hospitalId: 2
  },
  {
    id: 1003,
    name: "Dr. Vikram Rao",
    specialisation: "Orthopedics",
    phone: "+91-9810010003",
    address: "Bengaluru",
    hospitalId: 4
  },
  {
    id: 1004,
    name: "Dr. Sneha Kulkarni",
    specialisation: "Oncology",
    phone: "+91-9810010004",
    address: "Mumbai",
    hospitalId: 7
  },
  {
    id: 1005,
    name: "Dr. Rohan Iyer",
    specialisation: "General Medicine",
    phone: "+91-9810010005",
    address: "Gurugram",
    hospitalId: 9
  }
];

const patients = [
  { id: 2001, name: "Rahul Sharma", age: 34, gender: "Male", height: "172 cm", weight: "74 kg", address: "South Delhi", phone: "+91-9000000001", email: "rahul.sharma@example.com", date: "2026-04-01", attendantName: "Anita Sharma", attendantRelation: "Spouse", attendantPhone: "+91-9000001001" },
  { id: 2002, name: "Neha Verma", age: 29, gender: "Female", height: "160 cm", weight: "58 kg", address: "Noida", phone: "+91-9000000002", email: "neha.verma@example.com", date: "2026-04-01", attendantName: "Suresh Verma", attendantRelation: "Father", attendantPhone: "+91-9000001002" },
  { id: 2003, name: "Amit Singh", age: 42, gender: "Male", height: "176 cm", weight: "81 kg", address: "Lucknow", phone: "+91-9000000003", email: "amit.singh@example.com", date: "2026-04-01", attendantName: "Kavita Singh", attendantRelation: "Spouse", attendantPhone: "+91-9000001003" },
  { id: 2004, name: "Pooja Reddy", age: 31, gender: "Female", height: "165 cm", weight: "60 kg", address: "Hyderabad", phone: "+91-9000000004", email: "pooja.reddy@example.com", date: "2026-04-02", attendantName: "Ravi Reddy", attendantRelation: "Brother", attendantPhone: "+91-9000001004" },
  { id: 2005, name: "Vijay Kumar", age: 48, gender: "Male", height: "170 cm", weight: "78 kg", address: "Bengaluru", phone: "+91-9000000005", email: "vijay.kumar@example.com", date: "2026-04-02", attendantName: "Maya Kumar", attendantRelation: "Spouse", attendantPhone: "+91-9000001005" },
  { id: 2006, name: "Sonal Joshi", age: 27, gender: "Female", height: "158 cm", weight: "54 kg", address: "Pune", phone: "+91-9000000006", email: "sonal.joshi@example.com", date: "2026-04-02", attendantName: "Harish Joshi", attendantRelation: "Father", attendantPhone: "+91-9000001006" },
  { id: 2007, name: "Karan Malhotra", age: 39, gender: "Male", height: "180 cm", weight: "84 kg", address: "Chandigarh", phone: "+91-9000000007", email: "karan.malhotra@example.com", date: "2026-04-03", attendantName: "Simran Malhotra", attendantRelation: "Spouse", attendantPhone: "+91-9000001007" },
  { id: 2008, name: "Anjali Desai", age: 36, gender: "Female", height: "162 cm", weight: "59 kg", address: "Ahmedabad", phone: "+91-9000000008", email: "anjali.desai@example.com", date: "2026-04-03", attendantName: "Mahesh Desai", attendantRelation: "Husband", attendantPhone: "+91-9000001008" },
  { id: 2009, name: "Ritika Sinha", age: 24, gender: "Female", height: "155 cm", weight: "50 kg", address: "Patna", phone: "+91-9000000009", email: "ritika.sinha@example.com", date: "2026-04-03", attendantName: "Meena Sinha", attendantRelation: "Mother", attendantPhone: "+91-9000001009" },
  { id: 2010, name: "Deepak Patel", age: 45, gender: "Male", height: "174 cm", weight: "77 kg", address: "Surat", phone: "+91-9000000010", email: "deepak.patel@example.com", date: "2026-04-04", attendantName: "Nisha Patel", attendantRelation: "Spouse", attendantPhone: "+91-9000001010" },
  { id: 2011, name: "Ishita Roy", age: 33, gender: "Female", height: "167 cm", weight: "62 kg", address: "Kolkata", phone: "+91-9000000011", email: "ishita.roy@example.com", date: "2026-04-04", attendantName: "Arindam Roy", attendantRelation: "Husband", attendantPhone: "+91-9000001011" },
  { id: 2012, name: "Mohit Jain", age: 41, gender: "Male", height: "171 cm", weight: "75 kg", address: "Jaipur", phone: "+91-9000000012", email: "mohit.jain@example.com", date: "2026-04-04", attendantName: "Pallavi Jain", attendantRelation: "Spouse", attendantPhone: "+91-9000001012" },
  { id: 2013, name: "Nivedita Das", age: 30, gender: "Female", height: "161 cm", weight: "56 kg", address: "Bhubaneswar", phone: "+91-9000000013", email: "nivedita.das@example.com", date: "2026-04-05", attendantName: "Pranab Das", attendantRelation: "Brother", attendantPhone: "+91-9000001013" },
  { id: 2014, name: "Siddharth Bose", age: 38, gender: "Male", height: "178 cm", weight: "82 kg", address: "Kolkata", phone: "+91-9000000014", email: "siddharth.bose@example.com", date: "2026-04-05", attendantName: "Madhuri Bose", attendantRelation: "Spouse", attendantPhone: "+91-9000001014" },
  { id: 2015, name: "Ayesha Khan", age: 26, gender: "Female", height: "159 cm", weight: "53 kg", address: "Mumbai", phone: "+91-9000000015", email: "ayesha.khan@example.com", date: "2026-04-05", attendantName: "Farah Khan", attendantRelation: "Mother", attendantPhone: "+91-9000001015" }
];

module.exports = async function (callback) {
  try {
    const hospitalContract = await Hospital.deployed();
    const doctorContract = await Doctor.deployed();
    const patientContract = await Patient.deployed();

    const accounts = await web3.eth.getAccounts();
    const owner = accounts[0];

    // Seed 10 hospitals.
    for (const hospital of hospitals) {
      const exists = await hospitalContract.isHospitalRegistered(hospital.id);
      if (!exists) {
        await hospitalContract.registerHospital(
          hospital.id,
          hospital.name,
          hospital.address,
          hospital.specialisation,
          { from: owner }
        );
      }
    }

    // Seed 5 doctors spread across hospitals.
    for (let i = 0; i < doctors.length; i++) {
      const doctor = doctors[i];
      const exists = await doctorContract.isDoctorRegistered(doctor.id);
      if (exists) {
        continue;
      }

      const walletIndex = (i + 1) % accounts.length;
      const doctorWallet = accounts[walletIndex] || owner;

      await doctorContract.registerDoctor(
        doctor.id,
        doctor.name,
        doctor.specialisation,
        doctor.phone,
        doctor.address,
        doctor.hospitalId,
        doctorWallet,
        { from: owner }
      );
    }

    // Seed 15 patients.
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const exists = await patientContract.isPatientRegistered(patient.id);
      if (exists) {
        continue;
      }

      const fromAccount = accounts[i % accounts.length] || owner;

      await patientContract.registerPatient(
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
        patient.attendantPhone,
        { from: fromAccount }
      );
    }

    // eslint-disable-next-line no-console
    console.log("Demo data seeding completed: 10 hospitals, 5 doctors, 15 patients.");
    callback();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Demo data seeding failed:", error);
    callback(error);
  }
};
