// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IDoctorDirectory {
    function isDoctorRegistered(uint256 _doctorId) external view returns (bool);
    function getDoctorIdByWallet(address _wallet) external view returns (uint256);
}

contract Patient {
    IDoctorDirectory public immutable doctorContract;
    uint256 public patientCount;
    uint256 public constant MAX_PATIENTS = 15;

    struct Attendant {
        string name;
        string relation;
        string phone;
    }

    struct PatientInfo {
        uint256 patientId;
        string name;
        uint256 age;
        string gender;
        string height;
        string weight;
        string homeAddress;
        string phone;
        string email;
        string registrationDate;
        bool exists;
    }

    mapping(uint256 => PatientInfo) private patients;
    mapping(uint256 => Attendant) private attendants;
    mapping(uint256 => address) public patientOwnerById;
    mapping(address => uint256) public patientIdByWallet;

    mapping(uint256 => mapping(uint256 => bool)) private accessByPatientDoctor;
    mapping(uint256 => uint256[]) private doctorsWithAccess;

    uint256[] private patientIds;

    event PatientRegistered(uint256 indexed patientId, address indexed ownerWallet, string name);
    event AccessGranted(uint256 indexed patientId, uint256 indexed doctorId, uint256 timestamp);
    event AccessRevoked(uint256 indexed patientId, uint256 indexed doctorId, uint256 timestamp);

    modifier onlyPatientOwner(uint256 _patientId) {
        require(patientOwnerById[_patientId] == msg.sender, "Only patient owner can call this function");
        _;
    }

    /// @notice Sets the doctor contract address for doctor existence and wallet checks.
    constructor(address _doctorContractAddress) {
        require(_doctorContractAddress != address(0), "Doctor contract address is required");
        doctorContract = IDoctorDirectory(_doctorContractAddress);
    }

    /// @notice Registers a patient with full details and attendant data.
    /// @dev Registration is limited to 15 demo patients and binds patient ID to caller wallet.
    function registerPatient(
        uint256 _patientId,
        string calldata _name,
        uint256 _age,
        string calldata _gender,
        string calldata _height,
        string calldata _weight,
        string calldata _homeAddress,
        string calldata _phone,
        string calldata _email,
        string calldata _date,
        string calldata _attendantName,
        string calldata _attendantRelation,
        string calldata _attendantPhone
    ) external {
        require(_patientId > 0, "Patient ID must be greater than zero");
        require(bytes(_name).length > 0, "Patient name is required");
        require(bytes(_gender).length > 0, "Gender is required");
        require(bytes(_phone).length > 0, "Phone is required");
        require(bytes(_email).length > 0, "Email is required");
        require(bytes(_date).length > 0, "Date is required");
        require(patientCount < MAX_PATIENTS, "Maximum 15 patients allowed");
        require(!patients[_patientId].exists, "Patient already registered");

        patients[_patientId] = PatientInfo({
            patientId: _patientId,
            name: _name,
            age: _age,
            gender: _gender,
            height: _height,
            weight: _weight,
            homeAddress: _homeAddress,
            phone: _phone,
            email: _email,
            registrationDate: _date,
            exists: true
        });

        attendants[_patientId] = Attendant({
            name: _attendantName,
            relation: _attendantRelation,
            phone: _attendantPhone
        });

        patientOwnerById[_patientId] = msg.sender;
        if (patientIdByWallet[msg.sender] == 0) {
            patientIdByWallet[msg.sender] = _patientId;
        }
        patientIds.push(_patientId);
        patientCount += 1;

        emit PatientRegistered(_patientId, msg.sender, _name);
    }

    /// @notice Returns full patient and attendant details by patient ID.
    /// @dev Accessible only by patient-owner wallet or a registered doctor wallet.
    function getPatientDetails(
        uint256 _patientId
    )
        external
        view
        returns (
            uint256 patientId,
            string memory name,
            uint256 age,
            string memory gender,
            string memory height,
            string memory weight,
            string memory homeAddress,
            string memory phone,
            string memory email,
            string memory date,
            string memory attendantName,
            string memory attendantRelation,
            string memory attendantPhone,
            address ownerWallet,
            bool exists
        )
    {
        PatientInfo storage patient = patients[_patientId];
        require(patient.exists, "Patient not found");

        bool isOwner = patientOwnerById[_patientId] == msg.sender;
        uint256 viewerDoctorId = doctorContract.getDoctorIdByWallet(msg.sender);
        bool isDoctor = viewerDoctorId > 0 && doctorContract.isDoctorRegistered(viewerDoctorId);

        require(isOwner || isDoctor, "Only patient owner or registered doctor can view patient");

        Attendant storage attendant = attendants[_patientId];

        return (
            patient.patientId,
            patient.name,
            patient.age,
            patient.gender,
            patient.height,
            patient.weight,
            patient.homeAddress,
            patient.phone,
            patient.email,
            patient.registrationDate,
            attendant.name,
            attendant.relation,
            attendant.phone,
            patientOwnerById[_patientId],
            patient.exists
        );
    }

    /// @notice Grants record access for one doctor to one patient.
    /// @dev Only patient-owner wallet can grant access.
    function grantAccess(uint256 _patientId, uint256 _doctorId) external onlyPatientOwner(_patientId) {
        require(doctorContract.isDoctorRegistered(_doctorId), "Doctor not registered");

        if (!accessByPatientDoctor[_patientId][_doctorId]) {
            accessByPatientDoctor[_patientId][_doctorId] = true;
            doctorsWithAccess[_patientId].push(_doctorId);
        }

        emit AccessGranted(_patientId, _doctorId, block.timestamp);
    }

    /// @notice Revokes record access for one doctor from one patient.
    /// @dev Only patient-owner wallet can revoke access.
    function revokeAccess(uint256 _patientId, uint256 _doctorId) external onlyPatientOwner(_patientId) {
        require(doctorContract.isDoctorRegistered(_doctorId), "Doctor not registered");
        require(accessByPatientDoctor[_patientId][_doctorId], "Doctor does not currently have access");

        accessByPatientDoctor[_patientId][_doctorId] = false;

        uint256[] storage allowedDoctors = doctorsWithAccess[_patientId];
        uint256 lastIndex = allowedDoctors.length - 1;

        for (uint256 i = 0; i < allowedDoctors.length; i++) {
            if (allowedDoctors[i] == _doctorId) {
                allowedDoctors[i] = allowedDoctors[lastIndex];
                allowedDoctors.pop();
                break;
            }
        }

        emit AccessRevoked(_patientId, _doctorId, block.timestamp);
    }

    /// @notice Checks if a doctor currently has access to a patient's records.
    function hasAccess(uint256 _patientId, uint256 _doctorId) external view returns (bool) {
        return accessByPatientDoctor[_patientId][_doctorId];
    }

    /// @notice Returns all doctor IDs currently allowed by the patient.
    /// @dev Used in dashboard access-control table.
    function getDoctorsWithAccess(uint256 _patientId) external view onlyPatientOwner(_patientId) returns (uint256[] memory) {
        return doctorsWithAccess[_patientId];
    }

    /// @notice Checks if wallet address is owner of the given patient profile.
    function isPatientOwner(uint256 _patientId, address _wallet) external view returns (bool) {
        return patientOwnerById[_patientId] == _wallet;
    }

    /// @notice Returns all patient IDs for reporting/demo tooling.
    function getAllPatientIds() external view returns (uint256[] memory) {
        return patientIds;
    }

    /// @notice Checks whether a patient ID has already been registered.
    function isPatientRegistered(uint256 _patientId) external view returns (bool) {
        return patients[_patientId].exists;
    }
}
