// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Hospital {
    address public immutable owner;
    uint256 public hospitalCount;
    uint256 public constant MAX_HOSPITALS = 10;

    struct HospitalInfo {
        uint256 hospitalId;
        string name;
        string hospitalAddress;
        string specialisation;
        bool exists;
    }

    mapping(uint256 => HospitalInfo) private hospitals;
    uint256[] private hospitalIds;

    event HospitalRegistered(uint256 indexed hospitalId, string name, string specialisation);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can call this function");
        _;
    }

    /// @notice Sets the deployer as the hospital registry owner.
    constructor() {
        owner = msg.sender;
    }

    /// @notice Registers one hospital profile in the system.
    /// @dev Only contract owner can register hospitals and maximum is limited to 10 for demo scope.
    function registerHospital(
        uint256 _hospitalId,
        string calldata _name,
        string calldata _hospitalAddress,
        string calldata _specialisation
    ) external onlyOwner {
        require(_hospitalId > 0, "Hospital ID must be greater than zero");
        require(bytes(_name).length > 0, "Hospital name is required");
        require(bytes(_hospitalAddress).length > 0, "Hospital address is required");
        require(bytes(_specialisation).length > 0, "Specialisation is required");
        require(hospitalCount < MAX_HOSPITALS, "Maximum 10 hospitals allowed");
        require(!hospitals[_hospitalId].exists, "Hospital already registered");

        hospitals[_hospitalId] = HospitalInfo({
            hospitalId: _hospitalId,
            name: _name,
            hospitalAddress: _hospitalAddress,
            specialisation: _specialisation,
            exists: true
        });

        hospitalIds.push(_hospitalId);
        hospitalCount += 1;

        emit HospitalRegistered(_hospitalId, _name, _specialisation);
    }

    /// @notice Gets complete details of a single hospital by ID.
    function getHospitalDetails(
        uint256 _hospitalId
    )
        external
        view
        returns (
            uint256 hospitalId,
            string memory name,
            string memory hospitalAddress,
            string memory specialisation,
            bool exists
        )
    {
        HospitalInfo storage hospital = hospitals[_hospitalId];
        require(hospital.exists, "Hospital not found");

        return (
            hospital.hospitalId,
            hospital.name,
            hospital.hospitalAddress,
            hospital.specialisation,
            hospital.exists
        );
    }

    /// @notice Returns all hospitals as an array of structs for table rendering in frontend.
    function getAllHospitals() external view returns (HospitalInfo[] memory) {
        HospitalInfo[] memory allHospitals = new HospitalInfo[](hospitalIds.length);

        for (uint256 i = 0; i < hospitalIds.length; i++) {
            allHospitals[i] = hospitals[hospitalIds[i]];
        }

        return allHospitals;
    }

    /// @notice Returns all registered hospital IDs.
    function getHospitalIds() external view returns (uint256[] memory) {
        return hospitalIds;
    }

    /// @notice Checks whether the provided hospital ID is already registered.
    function isHospitalRegistered(uint256 _hospitalId) external view returns (bool) {
        return hospitals[_hospitalId].exists;
    }
}
