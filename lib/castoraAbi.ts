export const erc20Abi = [
    {
      constant: true,
      inputs: [],
      name: 'name',
      outputs: [
        {
          name: '',
          type: 'string'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: false,
      inputs: [
        {
          name: '_spender',
          type: 'address'
        },
        {
          name: '_value',
          type: 'uint256'
        }
      ],
      name: 'approve',
      outputs: [
        {
          name: '',
          type: 'bool'
        }
      ],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'totalSupply',
      outputs: [
        {
          name: '',
          type: 'uint256'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: false,
      inputs: [
        {
          name: '_from',
          type: 'address'
        },
        {
          name: '_to',
          type: 'address'
        },
        {
          name: '_value',
          type: 'uint256'
        }
      ],
      name: 'transferFrom',
      outputs: [
        {
          name: '',
          type: 'bool'
        }
      ],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'decimals',
      outputs: [
        {
          name: '',
          type: 'uint8'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: true,
      inputs: [
        {
          name: '_owner',
          type: 'address'
        }
      ],
      name: 'balanceOf',
      outputs: [
        {
          name: 'balance',
          type: 'uint256'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: true,
      inputs: [],
      name: 'symbol',
      outputs: [
        {
          name: '',
          type: 'string'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      constant: false,
      inputs: [
        {
          name: '_to',
          type: 'address'
        },
        {
          name: '_value',
          type: 'uint256'
        }
      ],
      name: 'transfer',
      outputs: [
        {
          name: '',
          type: 'bool'
        }
      ],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function'
    },
    {
      constant: true,
      inputs: [
        {
          name: '_owner',
          type: 'address'
        },
        {
          name: '_spender',
          type: 'address'
        }
      ],
      name: 'allowance',
      outputs: [
        {
          name: '',
          type: 'uint256'
        }
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function'
    },
    {
      payable: true,
      stateMutability: 'payable',
      type: 'fallback'
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          name: 'owner',
          type: 'address'
        },
        {
          indexed: true,
          name: 'spender',
          type: 'address'
        },
        {
          indexed: false,
          name: 'value',
          type: 'uint256'
        }
      ],
      name: 'Approval',
      type: 'event'
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          name: 'from',
          type: 'address'
        },
        {
          indexed: true,
          name: 'to',
          type: 'address'
        },
        {
          indexed: false,
          name: 'value',
          type: 'uint256'
        }
      ],
      name: 'Transfer',
      type: 'event'
    }
  ] as const;
export const abi = [
    { type: 'fallback', stateMutability: 'payable' },
    { type: 'receive', stateMutability: 'payable' },
    {
      type: 'function',
      name: 'ADMIN_ROLE',
      inputs: [],
      outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'DEFAULT_ADMIN_ROLE',
      inputs: [],
      outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'PREDICTION_DECIMALS',
      inputs: [],
      outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'UPGRADE_INTERFACE_VERSION',
      inputs: [],
      outputs: [{ name: '', type: 'string', internalType: 'string' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'WINNER_FEE_PERCENT',
      inputs: [],
      outputs: [{ name: '', type: 'uint8', internalType: 'uint8' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'claimWinnings',
      inputs: [
        { name: 'poolId', type: 'uint256', internalType: 'uint256' },
        { name: 'predictionId', type: 'uint256', internalType: 'uint256' }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'claimWinningsBulk',
      inputs: [
        { name: 'poolIds', type: 'uint256[]', internalType: 'uint256[]' },
        { name: 'predictionIds', type: 'uint256[]', internalType: 'uint256[]' }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'completePool',
      inputs: [
        { name: 'poolId', type: 'uint256', internalType: 'uint256' },
        { name: 'snapshotPrice', type: 'uint256', internalType: 'uint256' },
        { name: 'noOfWinners', type: 'uint256', internalType: 'uint256' },
        { name: 'winAmount', type: 'uint256', internalType: 'uint256' },
        {
          name: 'winnerPredictions',
          type: 'uint256[]',
          internalType: 'uint256[]'
        }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'createPool',
      inputs: [
        {
          name: 'seeds',
          type: 'tuple',
          internalType: 'struct PoolSeeds',
          components: [
            { name: 'predictionToken', type: 'address', internalType: 'address' },
            { name: 'stakeToken', type: 'address', internalType: 'address' },
            { name: 'stakeAmount', type: 'uint256', internalType: 'uint256' },
            { name: 'snapshotTime', type: 'uint256', internalType: 'uint256' },
            { name: 'windowCloseTime', type: 'uint256', internalType: 'uint256' }
          ]
        }
      ],
      outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'feeCollector',
      inputs: [],
      outputs: [{ name: '', type: 'address', internalType: 'address' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'getPool',
      inputs: [{ name: 'poolId', type: 'uint256', internalType: 'uint256' }],
      outputs: [
        {
          name: 'pool',
          type: 'tuple',
          internalType: 'struct Pool',
          components: [
            { name: 'poolId', type: 'uint256', internalType: 'uint256' },
            {
              name: 'seeds',
              type: 'tuple',
              internalType: 'struct PoolSeeds',
              components: [
                {
                  name: 'predictionToken',
                  type: 'address',
                  internalType: 'address'
                },
                { name: 'stakeToken', type: 'address', internalType: 'address' },
                { name: 'stakeAmount', type: 'uint256', internalType: 'uint256' },
                {
                  name: 'snapshotTime',
                  type: 'uint256',
                  internalType: 'uint256'
                },
                {
                  name: 'windowCloseTime',
                  type: 'uint256',
                  internalType: 'uint256'
                }
              ]
            },
            { name: 'seedsHash', type: 'bytes32', internalType: 'bytes32' },
            { name: 'creationTime', type: 'uint256', internalType: 'uint256' },
            { name: 'noOfPredictions', type: 'uint256', internalType: 'uint256' },
            { name: 'snapshotPrice', type: 'uint256', internalType: 'uint256' },
            { name: 'completionTime', type: 'uint256', internalType: 'uint256' },
            { name: 'winAmount', type: 'uint256', internalType: 'uint256' },
            { name: 'noOfWinners', type: 'uint256', internalType: 'uint256' },
            {
              name: 'noOfClaimedWinnings',
              type: 'uint256',
              internalType: 'uint256'
            }
          ]
        }
      ],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'getPrediction',
      inputs: [
        { name: 'poolId', type: 'uint256', internalType: 'uint256' },
        { name: 'predictionId', type: 'uint256', internalType: 'uint256' }
      ],
      outputs: [
        {
          name: 'prediction',
          type: 'tuple',
          internalType: 'struct Prediction',
          components: [
            { name: 'predicter', type: 'address', internalType: 'address' },
            { name: 'poolId', type: 'uint256', internalType: 'uint256' },
            { name: 'predictionId', type: 'uint256', internalType: 'uint256' },
            { name: 'predictionPrice', type: 'uint256', internalType: 'uint256' },
            { name: 'predictionTime', type: 'uint256', internalType: 'uint256' },
            {
              name: 'claimedWinningsTime',
              type: 'uint256',
              internalType: 'uint256'
            },
            { name: 'isAWinner', type: 'bool', internalType: 'bool' }
          ]
        }
      ],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'getPredictionIdsForAddress',
      inputs: [
        { name: 'poolId', type: 'uint256', internalType: 'uint256' },
        { name: 'predicter', type: 'address', internalType: 'address' }
      ],
      outputs: [
        { name: 'predictionIds', type: 'uint256[]', internalType: 'uint256[]' }
      ],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'getRoleAdmin',
      inputs: [{ name: 'role', type: 'bytes32', internalType: 'bytes32' }],
      outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'grantAdminRole',
      inputs: [{ name: 'admin', type: 'address', internalType: 'address' }],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'grantRole',
      inputs: [
        { name: 'role', type: 'bytes32', internalType: 'bytes32' },
        { name: 'account', type: 'address', internalType: 'address' }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'hasRole',
      inputs: [
        { name: 'role', type: 'bytes32', internalType: 'bytes32' },
        { name: 'account', type: 'address', internalType: 'address' }
      ],
      outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'hashPoolSeeds',
      inputs: [
        {
          name: 'seeds',
          type: 'tuple',
          internalType: 'struct PoolSeeds',
          components: [
            { name: 'predictionToken', type: 'address', internalType: 'address' },
            { name: 'stakeToken', type: 'address', internalType: 'address' },
            { name: 'stakeAmount', type: 'uint256', internalType: 'uint256' },
            { name: 'snapshotTime', type: 'uint256', internalType: 'uint256' },
            { name: 'windowCloseTime', type: 'uint256', internalType: 'uint256' }
          ]
        }
      ],
      outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
      stateMutability: 'pure'
    },
    {
      type: 'function',
      name: 'initialize',
      inputs: [
        { name: 'feeCollector_', type: 'address', internalType: 'address' }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'joinedPoolIdsByAddresses',
      inputs: [
        { name: '', type: 'address', internalType: 'address' },
        { name: '', type: 'uint256', internalType: 'uint256' }
      ],
      outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'noOfJoinedPoolsByAddresses',
      inputs: [{ name: '', type: 'address', internalType: 'address' }],
      outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'noOfPools',
      inputs: [],
      outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'owner',
      inputs: [],
      outputs: [{ name: '', type: 'address', internalType: 'address' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'poolIdsBySeedsHashes',
      inputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
      outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'pools',
      inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      outputs: [
        { name: 'poolId', type: 'uint256', internalType: 'uint256' },
        {
          name: 'seeds',
          type: 'tuple',
          internalType: 'struct PoolSeeds',
          components: [
            { name: 'predictionToken', type: 'address', internalType: 'address' },
            { name: 'stakeToken', type: 'address', internalType: 'address' },
            { name: 'stakeAmount', type: 'uint256', internalType: 'uint256' },
            { name: 'snapshotTime', type: 'uint256', internalType: 'uint256' },
            { name: 'windowCloseTime', type: 'uint256', internalType: 'uint256' }
          ]
        },
        { name: 'seedsHash', type: 'bytes32', internalType: 'bytes32' },
        { name: 'creationTime', type: 'uint256', internalType: 'uint256' },
        { name: 'noOfPredictions', type: 'uint256', internalType: 'uint256' },
        { name: 'snapshotPrice', type: 'uint256', internalType: 'uint256' },
        { name: 'completionTime', type: 'uint256', internalType: 'uint256' },
        { name: 'winAmount', type: 'uint256', internalType: 'uint256' },
        { name: 'noOfWinners', type: 'uint256', internalType: 'uint256' },
        { name: 'noOfClaimedWinnings', type: 'uint256', internalType: 'uint256' }
      ],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'predict',
      inputs: [
        { name: 'poolId', type: 'uint256', internalType: 'uint256' },
        { name: 'predictionPrice', type: 'uint256', internalType: 'uint256' }
      ],
      outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      stateMutability: 'payable'
    },
    {
      type: 'function',
      name: 'proxiableUUID',
      inputs: [],
      outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'renounceOwnership',
      inputs: [],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'renounceRole',
      inputs: [
        { name: 'role', type: 'bytes32', internalType: 'bytes32' },
        { name: 'callerConfirmation', type: 'address', internalType: 'address' }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'revokeAdminRole',
      inputs: [{ name: 'admin', type: 'address', internalType: 'address' }],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'revokeRole',
      inputs: [
        { name: 'role', type: 'bytes32', internalType: 'bytes32' },
        { name: 'account', type: 'address', internalType: 'address' }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'setFeeCollector',
      inputs: [
        { name: 'newFeeCollector', type: 'address', internalType: 'address' }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'supportsInterface',
      inputs: [{ name: 'interfaceId', type: 'bytes4', internalType: 'bytes4' }],
      outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'totalClaimedWinningsAmounts',
      inputs: [{ name: '', type: 'address', internalType: 'address' }],
      outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'totalNoOfClaimedWinningsPredictions',
      inputs: [],
      outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'totalNoOfPredictions',
      inputs: [],
      outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'totalStakedAmounts',
      inputs: [{ name: '', type: 'address', internalType: 'address' }],
      outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
      stateMutability: 'view'
    },
    {
      type: 'function',
      name: 'transferOwnership',
      inputs: [{ name: 'newOwner', type: 'address', internalType: 'address' }],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'function',
      name: 'upgradeToAndCall',
      inputs: [
        { name: 'newImplementation', type: 'address', internalType: 'address' },
        { name: 'data', type: 'bytes', internalType: 'bytes' }
      ],
      outputs: [],
      stateMutability: 'payable'
    },
    {
      type: 'function',
      name: 'withdraw',
      inputs: [
        { name: 'token', type: 'address', internalType: 'address' },
        { name: 'amount', type: 'uint256', internalType: 'uint256' }
      ],
      outputs: [],
      stateMutability: 'nonpayable'
    },
    {
      type: 'event',
      name: 'ClaimedWinnings',
      inputs: [
        {
          name: 'poolId',
          type: 'uint256',
          indexed: true,
          internalType: 'uint256'
        },
        {
          name: 'predictionId',
          type: 'uint256',
          indexed: true,
          internalType: 'uint256'
        },
        {
          name: 'winner',
          type: 'address',
          indexed: true,
          internalType: 'address'
        },
        {
          name: 'stakeToken',
          type: 'address',
          indexed: false,
          internalType: 'address'
        },
        {
          name: 'stakedAmount',
          type: 'uint256',
          indexed: false,
          internalType: 'uint256'
        },
        {
          name: 'wonAmount',
          type: 'uint256',
          indexed: false,
          internalType: 'uint256'
        }
      ],
      anonymous: false
    },
    {
      type: 'event',
      name: 'CompletedPool',
      inputs: [
        {
          name: 'poolId',
          type: 'uint256',
          indexed: true,
          internalType: 'uint256'
        },
        {
          name: 'snapshotTime',
          type: 'uint256',
          indexed: false,
          internalType: 'uint256'
        },
        {
          name: 'snapshotPrice',
          type: 'uint256',
          indexed: false,
          internalType: 'uint256'
        },
        {
          name: 'winAmount',
          type: 'uint256',
          indexed: false,
          internalType: 'uint256'
        },
        {
          name: 'noOfWinners',
          type: 'uint256',
          indexed: false,
          internalType: 'uint256'
        }
      ],
      anonymous: false
    },
    {
      type: 'event',
      name: 'CreatedPool',
      inputs: [
        {
          name: 'poolId',
          type: 'uint256',
          indexed: true,
          internalType: 'uint256'
        },
        {
          name: 'seedsHash',
          type: 'bytes32',
          indexed: true,
          internalType: 'bytes32'
        }
      ],
      anonymous: false
    },
    {
      type: 'event',
      name: 'Initialized',
      inputs: [
        {
          name: 'version',
          type: 'uint64',
          indexed: false,
          internalType: 'uint64'
        }
      ],
      anonymous: false
    },
    {
      type: 'event',
      name: 'OwnershipTransferred',
      inputs: [
        {
          name: 'previousOwner',
          type: 'address',
          indexed: true,
          internalType: 'address'
        },
        {
          name: 'newOwner',
          type: 'address',
          indexed: true,
          internalType: 'address'
        }
      ],
      anonymous: false
    },
    {
      type: 'event',
      name: 'Predicted',
      inputs: [
        {
          name: 'poolId',
          type: 'uint256',
          indexed: true,
          internalType: 'uint256'
        },
        {
          name: 'predictionId',
          type: 'uint256',
          indexed: true,
          internalType: 'uint256'
        },
        {
          name: 'predicter',
          type: 'address',
          indexed: true,
          internalType: 'address'
        },
        {
          name: 'predictionPrice',
          type: 'uint256',
          indexed: false,
          internalType: 'uint256'
        }
      ],
      anonymous: false
    },
    {
      type: 'event',
      name: 'RoleAdminChanged',
      inputs: [
        { name: 'role', type: 'bytes32', indexed: true, internalType: 'bytes32' },
        {
          name: 'previousAdminRole',
          type: 'bytes32',
          indexed: true,
          internalType: 'bytes32'
        },
        {
          name: 'newAdminRole',
          type: 'bytes32',
          indexed: true,
          internalType: 'bytes32'
        }
      ],
      anonymous: false
    },
    {
      type: 'event',
      name: 'RoleGranted',
      inputs: [
        { name: 'role', type: 'bytes32', indexed: true, internalType: 'bytes32' },
        {
          name: 'account',
          type: 'address',
          indexed: true,
          internalType: 'address'
        },
        {
          name: 'sender',
          type: 'address',
          indexed: true,
          internalType: 'address'
        }
      ],
      anonymous: false
    },
    {
      type: 'event',
      name: 'RoleRevoked',
      inputs: [
        { name: 'role', type: 'bytes32', indexed: true, internalType: 'bytes32' },
        {
          name: 'account',
          type: 'address',
          indexed: true,
          internalType: 'address'
        },
        {
          name: 'sender',
          type: 'address',
          indexed: true,
          internalType: 'address'
        }
      ],
      anonymous: false
    },
    {
      type: 'event',
      name: 'Upgraded',
      inputs: [
        {
          name: 'implementation',
          type: 'address',
          indexed: true,
          internalType: 'address'
        }
      ],
      anonymous: false
    },
    { type: 'error', name: 'AccessControlBadConfirmation', inputs: [] },
    {
      type: 'error',
      name: 'AccessControlUnauthorizedAccount',
      inputs: [
        { name: 'account', type: 'address', internalType: 'address' },
        { name: 'neededRole', type: 'bytes32', internalType: 'bytes32' }
      ]
    },
    {
      type: 'error',
      name: 'AddressEmptyCode',
      inputs: [{ name: 'target', type: 'address', internalType: 'address' }]
    },
    { type: 'error', name: 'AlreadyClaimedWinnings', inputs: [] },
    {
      type: 'error',
      name: 'ERC1967InvalidImplementation',
      inputs: [
        { name: 'implementation', type: 'address', internalType: 'address' }
      ]
    },
    { type: 'error', name: 'ERC1967NonPayable', inputs: [] },
    { type: 'error', name: 'FailedCall', inputs: [] },
    { type: 'error', name: 'InsufficientStakeValue', inputs: [] },
    { type: 'error', name: 'InvalidAddress', inputs: [] },
    { type: 'error', name: 'InvalidInitialization', inputs: [] },
    { type: 'error', name: 'InvalidPoolId', inputs: [] },
    { type: 'error', name: 'InvalidPoolTimes', inputs: [] },
    { type: 'error', name: 'InvalidPredictionId', inputs: [] },
    { type: 'error', name: 'InvalidWinnersCount', inputs: [] },
    { type: 'error', name: 'NoPredictionsInPool', inputs: [] },
    { type: 'error', name: 'NotAWinner', inputs: [] },
    { type: 'error', name: 'NotInitializing', inputs: [] },
    { type: 'error', name: 'NotYetSnapshotTime', inputs: [] },
    { type: 'error', name: 'NotYourPrediction', inputs: [] },
    {
      type: 'error',
      name: 'OwnableInvalidOwner',
      inputs: [{ name: 'owner', type: 'address', internalType: 'address' }]
    },
    {
      type: 'error',
      name: 'OwnableUnauthorizedAccount',
      inputs: [{ name: 'account', type: 'address', internalType: 'address' }]
    },
    { type: 'error', name: 'PoolAlreadyCompleted', inputs: [] },
    { type: 'error', name: 'PoolExistsAlready', inputs: [] },
    { type: 'error', name: 'PoolNotYetCompleted', inputs: [] },
    { type: 'error', name: 'ReentrancyGuardReentrantCall', inputs: [] },
    { type: 'error', name: 'UUPSUnauthorizedCallContext', inputs: [] },
    {
      type: 'error',
      name: 'UUPSUnsupportedProxiableUUID',
      inputs: [{ name: 'slot', type: 'bytes32', internalType: 'bytes32' }]
    },
    { type: 'error', name: 'UnmatchingPoolsAndPredictions', inputs: [] },
    { type: 'error', name: 'UnsuccessfulFeeCollection', inputs: [] },
    { type: 'error', name: 'UnsuccessfulSendWinnings', inputs: [] },
    { type: 'error', name: 'UnsuccessfulStaking', inputs: [] },
    { type: 'error', name: 'WindowHasClosed', inputs: [] },
    { type: 'error', name: 'ZeroAmountSpecified', inputs: [] }
  ] as const;
export const castoraAbi = abi;