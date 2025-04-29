// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract MonadNFT1155 is ERC1155, Ownable, IERC2981 {
    using Strings for uint256;

    string private _name;
    string private _symbol;
    string private _baseUri;
    uint256 public maxSupply;
    uint256 public totalSupply;
    uint256 private _royaltyBps;
    address private _royaltyRecipient;

    event ContractDeployed(address indexed deployer, string name, string symbol);
    event BaseURIUpdated(string newBaseURI);
    event RoyaltyUpdated(address indexed recipient, uint256 bps);
    event TokensMinted(address indexed to, uint256 indexed id, uint256 amount);
    event BatchMinted(address indexed to, uint256[] ids, uint256[] amounts);

    error InvalidRoyaltyBps(uint256 bps);
    error MaxSupplyReached();
    error ArrayLengthMismatch();
    error InvalidMintAmount();

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseUri_,
        uint256 maxSupply_,
        uint256 royaltyBps_
    ) ERC1155(baseUri_) Ownable(msg.sender) {
        if (royaltyBps_ > 10000) revert InvalidRoyaltyBps(royaltyBps_);
        
        _name = name_;
        _symbol = symbol_;
        _baseUri = baseUri_;
        maxSupply = maxSupply_;
        totalSupply = 0;
        _royaltyBps = royaltyBps_;
        _royaltyRecipient = msg.sender;

        emit ContractDeployed(msg.sender, name_, symbol_);
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseUri = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function setRoyaltyInfo(address recipient, uint256 royaltyBps) external onlyOwner {
        if (royaltyBps > 10000) revert InvalidRoyaltyBps(royaltyBps);
        
        _royaltyRecipient = recipient;
        _royaltyBps = royaltyBps;
        emit RoyaltyUpdated(recipient, royaltyBps);
    }

    function mint(address to, uint256 id, uint256 amount, bytes memory data) external onlyOwner {
        if (amount == 0) revert InvalidMintAmount();
        if (totalSupply + amount > maxSupply) revert MaxSupplyReached();

        totalSupply += amount;
        _mint(to, id, amount, data);
        emit TokensMinted(to, id, amount);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        if (ids.length != amounts.length) revert ArrayLengthMismatch();

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            if (amounts[i] == 0) revert InvalidMintAmount();
            totalAmount += amounts[i];
        }
        
        if (totalSupply + totalAmount > maxSupply) revert MaxSupplyReached();

        totalSupply += totalAmount;
        _mintBatch(to, ids, amounts, data);
        emit BatchMinted(to, ids, amounts);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(_baseUri, tokenId.toString(), ".json"));
    }

    function royaltyInfo(uint256, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        royaltyAmount = (salePrice * _royaltyBps) / 10000;
        return (_royaltyRecipient, royaltyAmount);
    }

    function getRoyaltyInfo() external view returns (address recipient, uint256 bps) {
        return (_royaltyRecipient, _royaltyBps);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }
}