import {
  Card,
  CardContent,
  Typography,
  Box,
  ButtonBase,
  Divider,
  useTheme,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MovieIcon from '@mui/icons-material/Movie';
import { decodeIfEncoded } from '../../utils/decode';
import { VideoPlayer } from './VideoPlayer';

type VideoCardProps = {
  owner?: string;
  resourceData: { service: string; name: string; identifier: string };
  openExternal: () => void;
  external?: any;
  encryptionType?: string | false;
};

export const VideoCard = ({
  owner,
  resourceData,
  openExternal,
  external,
}: VideoCardProps) => {
  const theme = useTheme();

  return (
    <Card sx={{ backgroundColor: theme.palette.background.default }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 16px 0px 16px',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MovieIcon sx={{ color: theme.palette.text.primary }} />
          <Typography>VIDEO embed</Typography>
        </Box>

        <Box sx={{ alignItems: 'center', display: 'flex', gap: '10px' }}>
          {external && (
            <ButtonBase>
              <OpenInNewIcon
                onClick={openExternal}
                sx={{ fontSize: '24px', color: theme.palette.text.primary }}
              />
            </ButtonBase>
          )}
        </Box>
      </Box>

      <Box sx={{ padding: '8px 16px 8px 16px' }}>
        {owner && (
          <Typography sx={{ fontSize: '12px' }}>
            Created by {decodeIfEncoded(owner)}
          </Typography>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgb(255 255 255 / 10%)' }} />

      <CardContent>
        <VideoPlayer
          service={resourceData?.service}
          name={resourceData?.name}
          identifier={resourceData?.identifier}
        />
      </CardContent>
    </Card>
  );
};