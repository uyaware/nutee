import type { ReactNode } from "react";
import {
    Avatar,
    Box,
    Divider,
    Paper,
    Stack,
    Typography,
    type AvatarProps,
    type PaperProps,
    type StackProps,
} from "@mui/material";

export function AccountSection({
    title,
    description,
    icon,
    iconVariant = "rounded",
    headerSpacing = 1.5,
    children,
    ...props
}: PaperProps & {
    title?: string;
    description?: string;
    icon?: ReactNode;
    iconVariant?: AvatarProps["variant"];
    headerSpacing?: StackProps["spacing"];
}) {
    return (
        <Paper variant="outlined" {...props}>
            {title && (
                <>
                    <Stack
                        direction="row"
                        spacing={headerSpacing}
                        alignItems="center"
                        sx={{ p: { xs: 2.5, sm: 3 } }}
                    >
                        {icon && (
                            <Avatar
                                variant={iconVariant}
                                sx={{
                                    bgcolor: "action.selected",
                                    color: "primary.main",
                                    width: 44,
                                    height: 44,
                                }}
                            >
                                {icon}
                            </Avatar>
                        )}
                        <Box>
                            <Typography variant="h3" component="h2">
                                {title}
                            </Typography>
                            {description && (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mt: 0.5 }}
                                >
                                    {description}
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                    <Divider />
                </>
            )}
            {children}
        </Paper>
    );
}

export function AccountSectionBody({ sx = [], ...props }: StackProps) {
    return (
        <Stack
            spacing={2.5}
            {...props}
            sx={[{ p: { xs: 2.5, sm: 3 } }, ...(Array.isArray(sx) ? sx : [sx])]}
        />
    );
}

export function AccountSectionActions(props: StackProps) {
    return (
        <>
            <Divider />
            <AccountSectionBody
                direction="row"
                spacing={0}
                justifyContent="flex-end"
                gap={1.5}
                {...props}
            />
        </>
    );
}
