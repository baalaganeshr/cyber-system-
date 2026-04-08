// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IDoctorLookup {
    function isDoctorRegistered(uint256 _doctorId) external view returns (bool);
    function getDoctorIdByWallet(address _wallet) external view returns (uint256);
    function getHospitalIdByDoctor(uint256 _doctorId) external view returns (uint256);
}

interface IPatientAccess {
    function hasAccess(uint256 _patientId, uint256 _doctorId) external view returns (bool);
    function isPatientOwner(uint256 _patientId, address _wallet) external view returns (bool);
}

contract MedicalRecord {
    IDoctorLookup public immutable doctorContract;
    IPatientAccess public immutable patientContract;
    uint256 public recordCount;

    struct PresentIllness {
        string complaints;
        string duration;
    }

    struct PastHistory {
        string familyHistory;
        string personalHistory;
        string drugHistory;
    }

    struct Diagnosis {
        string summary;
        string prescription;
    }

    struct Treatment {
        string treatment;
        string date;
        uint256 doctorId;
        uint256 hospitalId;
        string discharge;
        string followup;
    }

    struct Investigations {
        string blood;
        string urine;
        string ecg;
        string mri;
        string ct;
        string xray;
    }

    struct Insurance {
        bool applicable;
        string policyNumber;
        string insurer;
        string insuranceType;
        string coverageLimit;
    }

    struct RecordInput {
        uint256 recordId;
        uint256 patientId;
        uint256 doctorId;
        uint256 hospitalId;
        PresentIllness presentIllness;
        PastHistory pastHistory;
        Diagnosis diagnosis;
        Treatment treatment;
        Investigations investigations;
        Insurance insurance;
    }

    struct Record {
        uint256 recordId;
        uint256 patientId;
        uint256 doctorId;
        uint256 hospitalId;
        uint256 timestamp;
        PresentIllness presentIllness;
        PastHistory pastHistory;
        Diagnosis diagnosis;
        Treatment treatment;
        Investigations investigations;
        Insurance insurance;
        bool exists;
    }

    struct AccessLog {
        uint256 patientId;
        uint256 recordId;
        uint256 doctorId;
        uint256 hospitalId;
        address viewedBy;
        uint256 timestamp;
        string action;
    }

    mapping(uint256 => Record) private records;
    mapping(uint256 => uint256[]) private recordIdsByPatient;
    mapping(uint256 => AccessLog[]) private accessLogsByPatient;

    event RecordAdded(uint256 indexed recordId, uint256 indexed patientId, uint256 indexed doctorId, uint256 hospitalId);
    event AccessLogged(
        uint256 indexed patientId,
        uint256 indexed recordId,
        uint256 indexed doctorId,
        uint256 hospitalId,
        address viewedBy,
        uint256 timestamp,
        string action
    );

    modifier onlyAuthorizedDoctor(uint256 _patientId, uint256 _doctorId) {
        require(doctorContract.isDoctorRegistered(_doctorId), "Doctor is not registered");
        require(doctorContract.getDoctorIdByWallet(msg.sender) == _doctorId, "Doctor wallet mismatch");
        require(patientContract.hasAccess(_patientId, _doctorId), "Doctor does not have patient access");
        _;
    }

    /// @notice Initializes contract references for doctor registry and patient-consent checks.
    constructor(address _doctorContractAddress, address _patientContractAddress) {
        require(_doctorContractAddress != address(0), "Doctor contract address is required");
        require(_patientContractAddress != address(0), "Patient contract address is required");

        doctorContract = IDoctorLookup(_doctorContractAddress);
        patientContract = IPatientAccess(_patientContractAddress);
    }

    /// @notice Adds one full medical record using nested structs to avoid stack-depth issues.
    /// @dev Only patient-authorized doctor wallet can add records.
    function addRecord(RecordInput calldata _input) external onlyAuthorizedDoctor(_input.patientId, _input.doctorId) {
        require(_input.recordId > 0, "Record ID must be greater than zero");
        require(_input.patientId > 0, "Patient ID must be greater than zero");
        require(_input.hospitalId > 0, "Hospital ID must be greater than zero");
        require(!records[_input.recordId].exists, "Record ID already exists");

        uint256 doctorHospitalId = doctorContract.getHospitalIdByDoctor(_input.doctorId);
        require(doctorHospitalId == _input.hospitalId, "Hospital mismatch for doctor");

        Record storage record = records[_input.recordId];
        record.recordId = _input.recordId;
        record.patientId = _input.patientId;
        record.doctorId = _input.doctorId;
        record.hospitalId = _input.hospitalId;
        record.timestamp = block.timestamp;
        record.presentIllness = _input.presentIllness;
        record.pastHistory = _input.pastHistory;
        record.diagnosis = _input.diagnosis;
        record.treatment = _input.treatment;
        record.investigations = _input.investigations;
        record.insurance = _input.insurance;
        record.exists = true;

        recordIdsByPatient[_input.patientId].push(_input.recordId);
        recordCount += 1;

        _appendAccessLog(_input.patientId, _input.recordId, _input.doctorId, _input.hospitalId, msg.sender, "ADD_RECORD");

        emit RecordAdded(_input.recordId, _input.patientId, _input.doctorId, _input.hospitalId);
    }

    /// @notice Returns one medical record by record ID.
    /// @dev Caller must be patient-owner or authorized doctor.
    function getRecord(uint256 _recordId) external view returns (Record memory) {
        Record storage record = records[_recordId];
        require(record.exists, "Record not found");

        bool isPatient = patientContract.isPatientOwner(record.patientId, msg.sender);
        uint256 doctorId = doctorContract.getDoctorIdByWallet(msg.sender);
        bool isDoctor = doctorId > 0 && patientContract.hasAccess(record.patientId, doctorId);

        require(isPatient || isDoctor, "Not authorized to view record");
        return record;
    }

    /// @notice Returns all record IDs linked to a patient profile.
    /// @dev Caller must be patient-owner or authorized doctor.
    function getRecordsByPatient(uint256 _patientId) external view returns (uint256[] memory) {
        bool isPatient = patientContract.isPatientOwner(_patientId, msg.sender);
        uint256 doctorId = doctorContract.getDoctorIdByWallet(msg.sender);
        bool isDoctor = doctorId > 0 && patientContract.hasAccess(_patientId, doctorId);

        require(isPatient || isDoctor, "Not authorized to view patient records");
        return recordIdsByPatient[_patientId];
    }

    /// @notice Logs a single record-view event on-chain with timestamp.
    /// @dev Frontend should call this for each logical view action.
    function logRecordView(uint256 _recordId) external {
        Record storage record = records[_recordId];
        require(record.exists, "Record not found");

        bool isPatient = patientContract.isPatientOwner(record.patientId, msg.sender);
        uint256 doctorId = doctorContract.getDoctorIdByWallet(msg.sender);
        bool isDoctor = doctorId > 0 && patientContract.hasAccess(record.patientId, doctorId);

        require(isPatient || isDoctor, "Not authorized to log view");

        if (isDoctor) {
            uint256 hospitalId = doctorContract.getHospitalIdByDoctor(doctorId);
            _appendAccessLog(record.patientId, _recordId, doctorId, hospitalId, msg.sender, "VIEW_RECORD");
        } else {
            _appendAccessLog(record.patientId, _recordId, 0, 0, msg.sender, "PATIENT_VIEW_RECORD");
        }
    }

    /// @notice Logs patient-level records listing access on-chain with timestamp.
    function logPatientRecordsView(uint256 _patientId) external {
        bool isPatient = patientContract.isPatientOwner(_patientId, msg.sender);
        uint256 doctorId = doctorContract.getDoctorIdByWallet(msg.sender);
        bool isDoctor = doctorId > 0 && patientContract.hasAccess(_patientId, doctorId);

        require(isPatient || isDoctor, "Not authorized to log patient records view");

        if (isDoctor) {
            uint256 hospitalId = doctorContract.getHospitalIdByDoctor(doctorId);
            _appendAccessLog(_patientId, 0, doctorId, hospitalId, msg.sender, "VIEW_PATIENT_RECORDS");
        } else {
            _appendAccessLog(_patientId, 0, 0, 0, msg.sender, "PATIENT_VIEW_ALL_RECORDS");
        }
    }

    /// @notice Returns complete access log for a patient profile.
    /// @dev Only patient-owner can fetch access log entries.
    function getAccessLog(uint256 _patientId) external view returns (AccessLog[] memory) {
        require(patientContract.isPatientOwner(_patientId, msg.sender), "Only patient owner can view access log");
        return accessLogsByPatient[_patientId];
    }

    /// @notice Appends one access log entry into patient's immutable audit trail.
    function _appendAccessLog(
        uint256 _patientId,
        uint256 _recordId,
        uint256 _doctorId,
        uint256 _hospitalId,
        address _viewedBy,
        string memory _action
    ) internal {
        AccessLog memory entry = AccessLog({
            patientId: _patientId,
            recordId: _recordId,
            doctorId: _doctorId,
            hospitalId: _hospitalId,
            viewedBy: _viewedBy,
            timestamp: block.timestamp,
            action: _action
        });

        accessLogsByPatient[_patientId].push(entry);

        emit AccessLogged(
            _patientId,
            _recordId,
            _doctorId,
            _hospitalId,
            _viewedBy,
            entry.timestamp,
            _action
        );
    }
}
