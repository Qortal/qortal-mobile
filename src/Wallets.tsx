import React, { useEffect, useRef, useState } from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Input,
} from "@mui/material";
import { CustomButton } from "./App-styles";
import { useDropzone } from "react-dropzone";
import EditIcon from "@mui/icons-material/Edit";
import { Label } from "./components/Group/AddGroup";
import { Spacer } from "./common/Spacer";
import { getWallets, storeWallets, walletVersion } from "./background";
import { useModal } from "./common/useModal";
import PhraseWallet from "./utils/generateWallet/phrase-wallet";
import { decryptStoredWalletFromSeedPhrase } from "./utils/decryptWallet";
import { crypto } from "./constants/decryptWallet";
import { LoadingButton } from "@mui/lab";
import { PasswordField } from "./components";
import { FilePicker } from '@capawesome/capacitor-file-picker';

const parsefilenameQortal = (filename) => {
  return filename.startsWith("qortal_backup_") ? filename.slice(14) : filename;
};

export const Wallets = ({ setExtState, setRawWallet, rawWallet }) => {
  const [wallets, setWallets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [seedValue, setSeedValue] = useState("");
  const [seedName, setSeedName] = useState("");
  const [seedError, setSeedError] = useState("");

  const [password, setPassword] = useState("");
  const [isOpenSeedModal, setIsOpenSeedModal] = useState(false);
  const [isLoadingEncryptSeed, setIsLoadingEncryptSeed] = useState(false);

  const { isShow, onCancel, onOk, show } = useModal();

  const handleFilePick = async () => {
    try {
      const resultPermission = await FilePicker.checkPermissions();
      // Open the file picker to select a JSON file
      const result = await FilePicker.pickFiles({
        types: ['application/json'], // Restrict to JSON files
        multiple: true, // Allow only one file
        readData: true,

      });

      if (result.files.length > 0) {
        let importedWallets: any = [];

        for (const file of result.files) {
          try {
            const decodedData = atob(file.data); // `atob` decodes Base64 to a string
            const parsedFile = JSON.parse(decodedData);
            
    
            // Validate required fields
            const requiredFields = [
              "address0",
              "salt",
              "iv",
              "version",
              "encryptedSeed",
              "mac",
              "kdfThreads",
            ];
            for (const field of requiredFields) {
              if (!(field in parsedFile)) throw new Error(`${field} not found in JSON`);
            }
    
            // Set the state with parsed wallet data
            importedWallets.push({ ...parsedFile, filename: file?.name });
          } catch (error) {
            console.error(error);
          }
        }

        let uniqueInitialMap = new Map();

        // Only add a message if it doesn't already exist in the Map
        importedWallets.forEach((wallet) => {
          if (!wallet?.address0) return;
          if (!uniqueInitialMap.has(wallet?.address0)) {
            uniqueInitialMap.set(wallet?.address0, wallet);
          }
        });
        const data = Array.from(uniqueInitialMap.values());
        if (data && data?.length > 0) {
          const uniqueNewWallets = data.filter(
            (newWallet) =>
              !wallets.some(
                (existingWallet) =>
                  existingWallet?.address0 === newWallet?.address0
              )
          );
          setWallets([...wallets, ...uniqueNewWallets]);
        }


      } else {
        console.log("No file selected.");
      }
    } catch (error) {
      console.error("Error picking JSON file:", error);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/json": [".json"], // Only accept JSON files
    },
    onDrop: async (acceptedFiles) => {
      const files: any = acceptedFiles;
      let importedWallets: any = [];

      for (const file of files) {
        try {
          const fileContents = await new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onabort = () => reject("File reading was aborted");
            reader.onerror = () => reject("File reading has failed");
            reader.onload = () => {
              // Resolve the promise with the reader result when reading completes
              resolve(reader.result);
            };

            // Read the file as text
            reader.readAsText(file);
          });
          if (typeof fileContents !== "string") continue;
          const parsedData = JSON.parse(fileContents);
          importedWallets.push({ ...parsedData, filename: file?.name });
        } catch (error) {
          console.error(error);
        }
      }

      let uniqueInitialMap = new Map();

      // Only add a message if it doesn't already exist in the Map
      importedWallets.forEach((wallet) => {
        if (!wallet?.address0) return;
        if (!uniqueInitialMap.has(wallet?.address0)) {
          uniqueInitialMap.set(wallet?.address0, wallet);
        }
      });
      const data = Array.from(uniqueInitialMap.values());
      if (data && data?.length > 0) {
        const uniqueNewWallets = data.filter(
          (newWallet) =>
            !wallets.some(
              (existingWallet) =>
                existingWallet?.address0 === newWallet?.address0
            )
        );
        setWallets([...wallets, ...uniqueNewWallets]);
      }
    },
  });

  const updateWalletItem = (idx, wallet) => {
    setWallets((prev) => {
      let copyPrev = [...prev];
      if (wallet === null) {
        copyPrev.splice(idx, 1); // Use splice to remove the item
        return copyPrev;
      } else {
        copyPrev[idx] = wallet; // Update the wallet at the specified index
        return copyPrev;
      }
    });
  };

  const handleSetSeedValue = async () => {
    try {
      setIsOpenSeedModal(true);
      const { seedValue, seedName, password } = await show({
        message: "",
        publishFee: "",
      });
      setIsLoadingEncryptSeed(true);
      const res = await decryptStoredWalletFromSeedPhrase(seedValue);
      const wallet2 = new PhraseWallet(res, walletVersion);
      const wallet = await wallet2.generateSaveWalletData(
        password,
        crypto.kdfThreads,
        () => {}
      );
      if (wallet?.address0) {
        setWallets([
          ...wallets,
          {
            ...wallet,
            name: seedName,
          },
        ]);
        setIsOpenSeedModal(false);
        setSeedValue("");
        setSeedName("");
        setPassword("");
        setSeedError("");
      } else {
        setSeedError("Could not create wallet.");
      }
    } catch (error) {
      setSeedError(error?.message || "Could not create wallet.");
    } finally {
      setIsLoadingEncryptSeed(false);
    }
  };

  const selectedWalletFunc = (wallet) => {
    setRawWallet(wallet);
    setExtState("wallet-dropped");
  };

  useEffect(() => {
    setIsLoading(true);
    getWallets()
      .then((res) => {
        if (res && Array.isArray(res)) {
          setWallets(res);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isLoading && wallets && Array.isArray(wallets)) {
      storeWallets(wallets);
    }
  }, [wallets, isLoading]);

  if (isLoading) return null;

  return (
    <div>
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {wallets?.length === 0 || !wallets ? (
          <>
            <Typography>No wallets saved</Typography>
          </>
        ) : (
          <>
            <Typography>Your saved wallets</Typography>
          </>
        )}
      </Box>
      <Spacer height="10px" />
      {rawWallet && (
        <Box>
          <Typography>Selected Wallet:</Typography>
          {rawWallet?.name && <Typography>{rawWallet.name}</Typography>}
          {rawWallet?.address0 && (
            <Typography>{rawWallet?.address0}</Typography>
          )}
        </Box>
      )}
      {wallets?.length > 0 && (
        <List
          sx={{
            width: "100%",
            maxWidth: "500px",
            bgcolor: "background.paper",
            maxHeight: "60vh",
            overflow: "auto",
          }}
        >
          {wallets?.map((wallet, idx) => {
            return (
              <>
                <WalletItem
                  setSelectedWallet={selectedWalletFunc}
                  key={wallet?.address0}
                  wallet={wallet}
                  idx={idx}
                  updateWalletItem={updateWalletItem}
                />
                <Divider variant="inset" component="li" />
              </>
            );
          })}
        </List>
      )}

      <Box
        sx={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          position: wallets?.length === 0 ? "relative" : "fixed",
          bottom: wallets?.length === 0 ? 'unset' : "20px",
          right: wallets?.length === 0 ? 'unset' : "20px",
          flexDirection: wallets?.length === 0 ? "column" : "row",
        }}
      >
        <CustomButton
          onClick={handleSetSeedValue}
          sx={{
            padding: "10px",
          }}
        >
          Add seed-phrase
        </CustomButton>
        <CustomButton
          sx={{
            padding: "10px",
          }}
          onClick={handleFilePick}
        >
      
          Add wallets
        </CustomButton>
      </Box>

      <Dialog
        open={isOpenSeedModal}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        onKeyDown={(e) => {
          if (e.key === "Enter" && seedValue && seedName && password) {
            onOk({ seedValue, seedName, password });
          }
        }}
      >
        <DialogTitle id="alert-dialog-title">
          Type or paste in your seed-phrase
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Label>Name</Label>
            <Input
              placeholder="Name"
              value={seedName}
              onChange={(e) => setSeedName(e.target.value)}
            />
            <Spacer height="7px" />
            <Label>Seed-phrase</Label>
            <Input
              placeholder="Seed-phrase"
              value={seedValue}
              onChange={(e) => setSeedValue(e.target.value)}
            />
            <Spacer height="7px" />

            <Label>Choose new password</Label>
            <PasswordField
              id="standard-adornment-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={isLoadingEncryptSeed}
            variant="contained"
            onClick={() => {
              setIsOpenSeedModal(false);
              setSeedValue("");
              setSeedName("");
              setPassword("");
              setSeedError("");
            }}
          >
            Close
          </Button>
          <LoadingButton
            loading={isLoadingEncryptSeed}
            disabled={!seedValue || !seedName || !password}
            variant="contained"
            onClick={() => {
              if (!seedValue || !seedName || !password) return;
              onOk({ seedValue, seedName, password });
            }}
            autoFocus
          >
            Add
          </LoadingButton>
          <Typography
            sx={{
              fontSize: "14px",
              visibility: seedError ? "visible" : "hidden",
            }}
          >
            {seedError}
          </Typography>
        </DialogActions>
      </Dialog>
    </div>
  );
};

const WalletItem = ({ wallet, updateWalletItem, idx, setSelectedWallet }) => {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    if (wallet?.name) {
      setName(wallet.name);
    }
    if (wallet?.note) {
      setNote(wallet.note);
    }
  }, [wallet]);
  return (
    <>
      <ButtonBase
        onClick={() => {
          setSelectedWallet(wallet);
        }}
        sx={{
          width: "100%",
        }}
      >
        <ListItem
          secondaryAction={
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setIsEdit(true);
              }}
              edge="end"
              aria-label="edit"
            >
              <EditIcon
                sx={{
                  color: "white",
                }}
              />
            </IconButton>
          }
          alignItems="flex-start"
        >
          <ListItemAvatar>
            <Avatar alt="" src="/static/images/avatar/1.jpg" />
          </ListItemAvatar>
          <ListItemText
            primary={
              wallet?.name
                ? wallet.name
                : wallet?.filename
                ? parsefilenameQortal(wallet?.filename)
                : "No name"
            }
            secondary={
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ color: "text.primary", display: "inline" }}
                >
                  {wallet?.address0}
                </Typography>
                {wallet?.note}
              </Box>
            }
          />
        </ListItem>
      </ButtonBase>
      {isEdit && (
        <Box
          sx={{
            padding: "8px",
          }}
        >
          <Label>Name</Label>
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{
              width: "100%",
            }}
          />
          <Spacer height="10px" />
          <Label>Note</Label>
          <Input
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            inputProps={{
              maxLength: 100,
            }}
            sx={{
              width: "100%",
            }}
          />
          <Spacer height="10px" />
          <Box
            sx={{
              display: "flex",
              gap: "20px",
              justifyContent: "flex-end",
              width: "100%",
            }}
          >
            <Button
              size="small"
              variant="contained"
              onClick={() => setIsEdit(false)}
            >
              Close
            </Button>
            <Button
              sx={{
                backgroundColor: "var(--danger)",
                "&:hover": {
                  backgroundColor: "var(--danger)",
                },
                "&:focus": {
                  backgroundColor: "var(--danger)",
                },
              }}
              size="small"
              variant="contained"
              onClick={() => updateWalletItem(idx, null)}
            >
              Remove
            </Button>
            <Button
              sx={{
                backgroundColor: "#5EB049",
                "&:hover": {
                  backgroundColor: "#5EB049",
                },
                "&:focus": {
                  backgroundColor: "#5EB049",
                },
              }}
              size="small"
              variant="contained"
              onClick={() => {
                updateWalletItem(idx, {
                  ...wallet,
                  name,
                  note,
                });
                setIsEdit(false);
              }}
            >
              Save
            </Button>
          </Box>
        </Box>
      )}
    </>
  );
};
