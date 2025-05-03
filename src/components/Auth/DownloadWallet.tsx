import {
  Box,
  Checkbox,
  FormControlLabel,
  Typography,
  useTheme,
} from '@mui/material';
import { Spacer } from '../../common/Spacer';
import { PasswordField } from '../PasswordField/PasswordField';
import { ErrorText } from '../ErrorText/ErrorText';
import Logo1Dark from '../../assets/svgs/Logo1Dark.svg';
import { saveFileToDisk } from '../../utils/generateWallet/generateWallet';
import { useState } from 'react';
import { decryptStoredWallet } from '../../utils/decryptWallet';
import PhraseWallet from '../../utils/generateWallet/phrase-wallet';
import { crypto, walletVersion } from '../../constants/decryptWallet';
import Return from "../../assets/svgs/Return.svg";
import { CustomButton, CustomLabel, TextP } from '../../App-styles';

export const DownloadWallet = ({
  returnToMain,
  setIsLoading,
  showInfo,
  rawWallet,
  setWalletToBeDownloaded,
  walletToBeDownloaded,
}) => {
  const [walletToBeDownloadedPassword, setWalletToBeDownloadedPassword] =
    useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [keepCurrentPassword, setKeepCurrentPassword] = useState<boolean>(true);
  const theme = useTheme();
  const [walletToBeDownloadedError, setWalletToBeDownloadedError] =
    useState<string>('');


  const saveFileToDiskFunc = async () => {
    try {
      await saveFileToDisk(
        walletToBeDownloaded.wallet,
        walletToBeDownloaded.qortAddress
      );
    } catch (error: any) {
      setWalletToBeDownloadedError(error?.message);
    }
  };

  const saveWalletFunc = async (password: string, newPassword) => {
    let wallet = structuredClone(rawWallet);

    const res = await decryptStoredWallet(password, wallet);
    const wallet2 = new PhraseWallet(res, wallet?.version || walletVersion);
    const passwordToUse = newPassword || password;
    wallet = await wallet2.generateSaveWalletData(
      passwordToUse,
      crypto.kdfThreads,
      () => {}
    );

    setWalletToBeDownloaded({
      wallet,
      qortAddress: rawWallet.address0,
    });
    return {
      wallet,
      qortAddress: rawWallet.address0,
    };
  };

  const confirmPasswordToDownload = async () => {
    try {
      setWalletToBeDownloadedError('');
      if (!keepCurrentPassword && !newPassword) {
        setWalletToBeDownloadedError(
          'Please enter a new password'
        );
        return;
      }
      if (!walletToBeDownloadedPassword) {
        setWalletToBeDownloadedError(
          'Please enter your password'
        );
        return;
      }
      setIsLoading(true);
      await new Promise<void>((res) => {
        setTimeout(() => {
          res();
        }, 250);
      });
      const newPasswordForWallet = !keepCurrentPassword ? newPassword : null;
      const res = await saveWalletFunc(
        walletToBeDownloadedPassword,
        newPasswordForWallet
      );
    } catch (error: any) {
      setWalletToBeDownloadedError(error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Spacer height="22px" />
      <Box
        sx={{
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'flex-start',
          maxWidth: '700px',
          paddingLeft: '22px',
          width: '100%',
        }}
      >
        <img
                  style={{
                    cursor: "pointer",
                    height: '24px'
                  }}
                  onClick={returnToMain}
                  src={Return}
                />
       
      </Box>

      <Spacer height="10px" />

      <div
        className="image-container"
        style={{
          width: '136px',
          height: '154px',
        }}
      >
        <img src={Logo1Dark} className="base-image" />
      </div>

      <Spacer height="35px" />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <TextP
          sx={{
            textAlign: 'start',
            lineHeight: '24px',
            fontSize: '20px',
            fontWeight: 600,
          }}
        >
         Download account
        </TextP>
      </Box>

      <Spacer height="35px" />

      {!walletToBeDownloaded && (
        <>
          <CustomLabel htmlFor="standard-adornment-password">
            Confirm password
          </CustomLabel>

          <Spacer height="5px" />

          <PasswordField
            id="standard-adornment-password"
            value={walletToBeDownloadedPassword}
            onChange={(e) => setWalletToBeDownloadedPassword(e.target.value)}
          />

          <Spacer height="20px" />

          <FormControlLabel
            sx={{
              margin: 0,
            }}
            control={
              <Checkbox
                onChange={(e) => setKeepCurrentPassword(e.target.checked)}
                checked={keepCurrentPassword}
                edge="start"
                tabIndex={-1}
                disableRipple
                sx={{
                  '&.Mui-checked': {
                    color: theme.palette.text.secondary,
                  },
                  '& .MuiSvgIcon-root': {
                    color: theme.palette.text.secondary,
                  },
                }}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '14px' }}>
                Keep current password
                </Typography>
              </Box>
            }
          />
          <Spacer height="20px" />
          {!keepCurrentPassword && (
            <>
              <CustomLabel htmlFor="standard-adornment-password">
               New password
              </CustomLabel>

              <Spacer height="5px" />
              <PasswordField
                id="standard-adornment-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Spacer height="20px" />
            </>
          )}

          <CustomButton onClick={confirmPasswordToDownload}>
          Confirm wallet password
          </CustomButton>

          <ErrorText>{walletToBeDownloadedError}</ErrorText>
        </>
      )}

      {walletToBeDownloaded && (
        <>
          <CustomButton
            onClick={async () => {
              await saveFileToDiskFunc();
              await showInfo({
                message: 'Keep your account file secure',
              });
            }}
          >
           Download account
          </CustomButton>
        </>
      )}
    </>
  );
};
