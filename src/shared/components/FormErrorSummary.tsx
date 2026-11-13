import { useEffect, useRef } from "react";
import { reportErrorToast } from "@/shared/lib/errorToast";

export function FormErrorSummary({
    errors,
    submitCount,
}: {
    errors: { fieldId: string; message: string }[];
    submitCount: number;
}) {
    const previousSubmit = useRef(0);
    useEffect(() => {
        if (submitCount !== previousSubmit.current) {
            previousSubmit.current = submitCount;
            if (errors.length) {
                reportErrorToast(
                    errors.map((error) => error.message).join(" "),
                );
                document.getElementById(errors[0].fieldId)?.focus();
            }
        }
    }, [submitCount, errors]);
    return null;
}
