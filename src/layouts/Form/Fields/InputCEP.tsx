
import React, { useEffect, useRef } from "react";
import { Controller, FieldValues } from "react-hook-form";
import { Col, Form, InputGroup, Spinner } from "react-bootstrap";
import { IMaskInput } from 'react-imask';

import InputDTO, { default_containerClass } from "layouts/Form/types/Input";
import { cepInfo, CepData } from "layouts/Form/Services/Viacep";

type UpdateFields = {
    city?: string;
    state?: string;
    uf?: string;
    neighborhood?: string;
    street?: string;
};

interface InputCEPProps<T extends FieldValues> extends InputDTO<T> {
    updateFields?: UpdateFields;
    onLoading?: () => void;
    onLoaded?: () => void;
}

function InputCEP<T extends FieldValues>({
    fieldName,
    methods,
    label,
    placeholder,
    config = {},
    updateFields = {},
    onLoading = () => {},
    onLoaded = () => {},
    ...colProps
}: InputCEPProps<T>) {
    const { control, watch, setValue, clearErrors } = methods;

    const [isCepLoading, setIsCepLoading] = React.useState(false);
    const cepValue = watch(fieldName);

    const updateFieldsRef = useRef(updateFields);
    updateFieldsRef.current = updateFields;

    useEffect(() => {
        if (!cepValue || cepValue.replace(/\D/g, '').length < 8) return;

        const uf = updateFieldsRef.current;

        setIsCepLoading(true);
        onLoading();

        const sv = setValue as (name: string, value: string) => void;

        cepInfo(cepValue).then((data: CepData) => {
            if (data && !('erro' in data)) {
                if (uf.city)         sv(uf.city, data.localidade);
                if (uf.state)        sv(uf.state, data.estado);
                if (uf.uf)           sv(uf.uf, data.uf);
                if (uf.neighborhood) sv(uf.neighborhood, data.bairro);
                if (uf.street)       sv(uf.street, data.logradouro);
                clearErrors(Object.values(uf) as any);
            }
        }).finally(() => {
            setIsCepLoading(false);
            onLoaded();
        });
    }, [cepValue]);

    return (
        <Col {...colProps}>
            <Controller
                control={control}
                name={fieldName}
                rules={config.rules || { required: "CEP é obrigatório" }}
                render={({ field, fieldState }) => (
                    <Form.Group className={config.containerClass || default_containerClass}>
                        <Form.Label>{label || config.label || "CEP"}</Form.Label>
                        <InputGroup hasValidation>
                            <IMaskInput
                                mask="00000-000"
                                value={field.value || ''}
                                onAccept={(value: string) => field.onChange(value)}
                                onBlur={field.onBlur}
                                placeholder={config.placeholder || "00000-000"}
                                className={`form-control ${fieldState.error ? 'is-invalid' : ''} ${config.className || ''}`}
                            />
                            {isCepLoading && (
                                <InputGroup.Text>
                                    <Spinner animation="border" size="sm" />
                                </InputGroup.Text>
                            )}
                            {fieldState.error?.message ?? !!fieldState.error ? (
                                <Form.Control.Feedback type="invalid">
                                    {fieldState.error?.message}
                                </Form.Control.Feedback>
                            ) : (
                                <Form.Text className="text-muted">&nbsp;</Form.Text>
                            )}
                        </InputGroup>
                    </Form.Group>
                )}
            />
        </Col>
    );
}

export default InputCEP;
