import {
  Box,
  Container,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import MailOutlineRounded from "@mui/icons-material/MailOutlineRounded";
import PhoneOutlined from "@mui/icons-material/PhoneOutlined";
import { Link as RouterLink } from "react-router-dom";
import { Brand } from "@/shared/components/Brand";

// Sample contact details for the storefront prototype.
const contact = { email: "hotro@nutee.vn", phone: "0900 123 456" };

export function StorefrontFooter({ dark = false }: { dark?: boolean }) {
  return (
    <Box
      component="footer"
      sx={{
        position: "relative",
        bgcolor: dark ? "#0c101b" : "background.paper",
        color: dark ? "#f2f4f8" : "text.primary",
        ...(dark && { "& .MuiTypography-colorTextSecondary, & .MuiLink-root.MuiLink-underlineHover": { color: "#bdc7d8" } }),
        borderTop: "1px solid",
        borderColor: "divider",
        py: { xs: 4, md: 5 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "minmax(0, 1.4fr) repeat(2, minmax(0, 1fr))",
            },
            gap: { xs: 3, md: 5 },
          }}
        >
          <Stack spacing={2} sx={{ gridColumn: { sm: "1 / -1", md: "auto" } }}>
            <Brand />
            <Typography color="text.secondary" sx={{ maxWidth: 350 }}>
              Công nghệ cho công việc và cuộc sống. Khám phá những thiết bị phù
              hợp với nhu cầu của bạn tại NUTEE.
            </Typography>
            <Link
              component={RouterLink}
              to="/products"
              sx={{
                alignSelf: "flex-start",
                minHeight: 44,
                display: "flex",
                alignItems: "center",
              }}
            >
              Khám phá sản phẩm
            </Link>
          </Stack>
          <Stack>
            <Typography component="h2" variant="h4" sx={{ mb: 1 }}>
              Hỗ trợ khách hàng
            </Typography>
            {[
              { to: "/account/orders", label: "Tra cứu đơn hàng" },
              { to: "/account/after-sales", label: "Bảo hành & đổi trả" },
              { to: "/account/addresses", label: "Địa chỉ giao hàng" },
            ].map(({ to, label }) => (
              <Link
                key={to}
                component={RouterLink}
                to={to}
                color="text.secondary"
                sx={{
                  minHeight: 44,
                  display: "flex",
                  alignItems: "center",
                  "&:hover": { color: "primary.main" },
                }}
              >
                {label}
              </Link>
            ))}
          </Stack>
          <Stack>
            <Typography component="h2" variant="h4" sx={{ mb: 1 }}>
              Liên hệ NUTEE
            </Typography>
            <Link
              href={`mailto:${contact.email}`}
              color="text.secondary"
              sx={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                gap: 1,
                overflowWrap: "anywhere",
                "&:hover": { color: "primary.main" },
              }}
            >
              <MailOutlineRounded fontSize="small" color="primary" />
              {contact.email}
            </Link>
            <Link
              href={`tel:${contact.phone.replace(/\s/g, "")}`}
              color="text.secondary"
              sx={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                gap: 1,
                "&:hover": { color: "primary.main" },
              }}
            >
              <PhoneOutlined fontSize="small" color="primary" />
              {contact.phone}
            </Link>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Tư vấn sản phẩm, giao hàng và hỗ trợ sau mua.
            </Typography>
          </Stack>
        </Box>
        <Divider sx={{ my: 3 }} />
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} NUTEE. Không gian công nghệ của bạn.
        </Typography>
      </Container>
    </Box>
  );
}
