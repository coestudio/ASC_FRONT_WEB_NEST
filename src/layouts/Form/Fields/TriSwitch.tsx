
import React from "react";

export interface TriSwitchEdge<V> {
    value: V;
    label: string;
    onClick?: () => void;
}

interface TriSwitchProps<V> {
    value: V | null;
    onChange: (value: V | null) => void;
    left: TriSwitchEdge<V>;
    right: TriSwitchEdge<V>;
    centerLabel?: string;
    onCenterClick?: () => void;
    className?: string;
}

function TriSwitch<V>({
    value,
    onChange,
    left,
    right,
    centerLabel = "—",
    onCenterClick,
    className,
}: TriSwitchProps<V>) {
    const activeIndex = value === left.value ? 0 : value === right.value ? 2 : 1;

    const zones = [
        {
            label: left.label,
            onClick: () => {
                onChange(left.value);
                left.onClick?.();
            },
        },
        {
            label: centerLabel,
            onClick: () => {
                onChange(null);
                onCenterClick?.();
            },
        },
        {
            label: right.label,
            onClick: () => {
                onChange(right.value);
                right.onClick?.();
            },
        },
    ];

    return (
        <div className={`tri-switch tri-switch--pos-${activeIndex} ${className ?? ""}`}>
            <span className="tri-switch-highlight" />
            {zones.map((zone, index) => (
                <button
                    key={index}
                    type="button"
                    className="tri-switch-zone"
                    aria-pressed={index === activeIndex}
                    onClick={zone.onClick}
                >
                    {zone.label}
                </button>
            ))}
        </div>
    );
}

export default TriSwitch;
