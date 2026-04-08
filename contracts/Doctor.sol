// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IHospitalContract {
    function owner() external view returns (address);
    function isHospitalRegistered(uint256 _hospitalId) external view returns (bool);
}

contract Doctor {
    IHospitalContract public immutable hospitalContract;
    uint256 public doctorCount;

    struct DoctorInfo {
        uint256 doctorId;
        string name;
        string specialisation;
        string phone;
        string doctorAddress;
        uint256 hospitalId;
        address wallet;
        bool exists;
    }

    mapping(uint256 => DoctorInfo) private doctors;
    mapping(address => uint256) private doctorIdByWallet;
    mapping(uint256 => uint256[]) private doctorIdsByHospital;
    uint256[] private doctorIds;

    event DoctorRegistered(uint256 indexed doctorId, string name, uint256 indexed hospitalId, address wallet);

    modifier onlyRegisteredHospital(uint256 _hospitalId) {
        require(hospitalContract.isHospitalRegistered(_hospitalId), "Hospital is not registered");
        require(msg.sender == hospitalContract.owner(), "Only registered hospital can add doctor");
        _;
    }

    /// @notice Sets the Hospital contract reference for hospital validation.
    constructor(address _hospitalContractAddress) {
        require(_hospitalContractAddress != address(0), "Hospital contract address is required");
        hospitalContract = IHospitalContract(_hospitalContractAddress);
    }

    /// @notice Registers one doctor under a registered hospital.
    /// @dev Only hospital owner (registry owner) can register doctors mapped to a valid hospital ID.
    function registerDoctor(
        uint256 _doctorId,
        string calldata _name,
        string calldata _specialisation,
        string calldata _phone,
        string calldata _doctorAddress,
        uint256 _hospitalId,
        address _doctorWallet
    ) external onlyRegisteredHospital(_hospitalId) {
        require(_doctorId > 0, "Doctor ID must be greater than zero");
        require(bytes(_name).length > 0, "Doctor name is required");
        require(bytes(_specialisation).length > 0, "Doctor specialisation is required");
        require(bytes(_phone).length > 0, "Doctor phone is required");
        require(bytes(_doctorAddress).length > 0, "Doctor address is required");
        require(_doctorWallet != address(0), "Doctor wallet is required");
        require(!doctors[_doctorId].exists, "Doctor already registered");
        require(doctorIdByWallet[_doctorWallet] == 0, "Wallet already linked to doctor");

        doctors[_doctorId] = DoctorInfo({
            doctorId: _doctorId,
            name: _name,
            specialisation: _specialisation,
            phone: _phone,
            doctorAddress: _doctorAddress,
            hospitalId: _hospitalId,
            wallet: _doctorWallet,
            exists: true
        });

        doctorIds.push(_doctorId);
        doctorIdsByHospital[_hospitalId].push(_doctorId);
        doctorIdByWallet[_doctorWallet] = _doctorId;
        doctorCount += 1;

        emit DoctorRegistered(_doctorId, _name, _hospitalId, _doctorWallet);
    }

    /// @notice Gets full details of a doctor by doctor ID.
    function getDoctorDetails(
        uint256 _doctorId
    )
        external
        view
        returns (
            uint256 doctorId,
            string memory name,
            string memory specialisation,
            string memory phone,
            string memory doctorAddress,
            uint256 hospitalId,
            address wallet,
            bool exists
        )
    {
        DoctorInfo storage doctor = doctors[_doctorId];
        require(doctor.exists, "Doctor not found");

        return (
            doctor.doctorId,
            doctor.name,
            doctor.specialisation,
            doctor.phone,
            doctor.doctorAddress,
            doctor.hospitalId,
            doctor.wallet,
            doctor.exists
        );
    }

    /// @notice Returns all doctor profiles under a specific hospital.
    function getDoctorsByHospital(uint256 _hospitalId) external view returns (DoctorInfo[] memory) {
        uint256[] storage ids = doctorIdsByHospital[_hospitalId];
        DoctorInfo[] memory results = new DoctorInfo[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            results[i] = doctors[ids[i]];
        }

        return results;
    }

    /// @notice Returns doctor ID associated with a wallet for access-control checks.
    function getDoctorIdByWallet(address _wallet) external view returns (uint256) {
        return doctorIdByWallet[_wallet];
    }

    /// @notice Checks if a doctor ID is already registered.
    function isDoctorRegistered(uint256 _doctorId) external view returns (bool) {
        return doctors[_doctorId].exists;
    }

    /// @notice Returns all doctor IDs in the system.
    function getDoctorIds() external view returns (uint256[] memory) {
        return doctorIds;
    }

    /// @notice Returns the hospital ID where a doctor is registered.
    function getHospitalIdByDoctor(uint256 _doctorId) external view returns (uint256) {
        require(doctors[_doctorId].exists, "Doctor not found");
        return doctors[_doctorId].hospitalId;
    }
}
