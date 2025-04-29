// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract MonadNFT is ERC721, ERC721URIStorage, Ownable, IERC2981 {
    using Strings for uint256;

    string private _imageUrl;
    string private _description;
    uint256 public maxSupply;
    uint256 public totalSupply;
    uint256 private _royaltyBps;
    address private _royaltyRecipient;

    event ContractDeployed(address indexed deployer, string name, string symbol);
    event ImageUrlUpdated(string newImageUrl);
    event DescriptionUpdated(string newDescription);
    event RoyaltyUpdated(address indexed recipient, uint256 bps);
    event NFTMinted(address indexed to, uint256 indexed tokenId);

    error InvalidRoyaltyBps(uint256 bps);
    error MaxSupplyReached();
    error TokenAlreadyMinted(uint256 tokenId);
    error NonexistentToken(uint256 tokenId);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory imageUrl_,
        string memory description_,
        uint256 maxSupply_,
        uint256 royaltyBps_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        if (royaltyBps_ > 10000) revert InvalidRoyaltyBps(royaltyBps_);
        
        _imageUrl = imageUrl_;
        _description = description_;
        maxSupply = maxSupply_;
        totalSupply = 0;
        _royaltyBps = royaltyBps_;
        _royaltyRecipient = msg.sender;

        emit ContractDeployed(msg.sender, name_, symbol_);
    }

    function setImageUrl(string memory newImageUrl) external onlyOwner {
        _imageUrl = newImageUrl;
        emit ImageUrlUpdated(newImageUrl);
    }

    function setDescription(string memory newDescription) external onlyOwner {
        _description = newDescription;
        emit DescriptionUpdated(newDescription);
    }

    function setRoyaltyInfo(address recipient, uint256 royaltyBps) external onlyOwner {
        if (royaltyBps > 10000) revert InvalidRoyaltyBps(royaltyBps);
        
        _royaltyRecipient = recipient;
        _royaltyBps = royaltyBps;
        emit RoyaltyUpdated(recipient, royaltyBps);
    }

    function mint(address to, uint256 tokenId) external onlyOwner {
        if (totalSupply >= maxSupply) revert MaxSupplyReached();
        if (_ownerOf(tokenId) != address(0)) revert TokenAlreadyMinted(tokenId);

        totalSupply++;
        _safeMint(to, tokenId);
        emit NFTMinted(to, tokenId);
    }

    function generateTokenURI(uint256 tokenId) internal view returns (string memory) {
        bytes memory dataURI = abi.encodePacked(
            '{',
            '"name": "', name(), ' #', tokenId.toString(), '",',
            '"description": "', _description, '",',
            '"image": "', _imageUrl, '",',
            '"attributes": []',
            '}'
        );

        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(dataURI)
            )
        );
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert NonexistentToken(tokenId);
        return generateTokenURI(tokenId);
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

    function getImageUrl() external view returns (string memory) {
        return _imageUrl;
    }

    function getDescription() external view returns (string memory) {
        return _description;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }
}