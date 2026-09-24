import React, { useState, useEffect, useRef } from 'react';
import { FaMapMarkerAlt, FaSpinner, FaSearch, FaBus } from 'react-icons/fa';
import styles from './LocationAutocomplete.module.css';

/**
 * A reusable location autocomplete component using OpenStreetMap (Nominatim).
 * No API key required.
 */
function LocationAutocomplete({
    value,
    onChange,
    placeholder,
    name,
    className,
    inputClassName = "input",
    iconClassName = "inputIcon",
    icon: Icon = FaMapMarkerAlt,
    localSuggestions = []
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const containerRef = useRef(null);
    const debounceTimer = useRef(null);

    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (query) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            // Nominatim search API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
            );
            const data = await response.json();
            setSuggestions(data.map(item => ({
                id: item.place_id,
                display_name: item.display_name,
                name: item.name,
                isLocal: false
            })));
        } catch (error) {
            console.error('Error fetching locations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const newVal = e.target.value;
        setInputValue(newVal);
        setShowSuggestions(true);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            fetchSuggestions(newVal);
        }, 500);

        // Also notify parent of the manual change
        if (onChange) {
            onChange({ target: { name, value: newVal } });
        }
    };

    const handleSuggestionClick = (val) => {
        setInputValue(val);
        setSuggestions([]);
        setShowSuggestions(false);

        if (onChange) {
            onChange({ target: { name, value: val } });
        }
    };

    // Combine local and API suggestions
    const filteredLocal = localSuggestions.filter(s =>
        s.toLowerCase().includes(inputValue.toLowerCase()) && s !== inputValue
    );

    return (
        <div className={styles.autocompleteContainer} ref={containerRef}>
            <div className={className || ""}>
                {Icon && <Icon className={iconClassName} />}
                <input
                    type="text"
                    name={name}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={placeholder}
                    className={inputClassName}
                    autoComplete="off"
                />
                {isLoading && <FaSpinner className={styles.loadingSpinner} />}
            </div>

            {showSuggestions && (filteredLocal.length > 0 || suggestions.length > 0 || (inputValue.length >= 3 && !isLoading)) && (
                <ul className={styles.suggestionsList}>
                    {filteredLocal.map((s, idx) => (
                        <li
                            key={`local-${idx}`}
                            className={styles.suggestionItem}
                            onClick={() => handleSuggestionClick(s)}
                        >
                            <div className={styles.suggestionLeft}>
                                <FaBus className={styles.suggestionIcon} style={{ color: '#7c3aed' }} />
                                <div className={styles.suggestionText}>
                                    <strong>{s}</strong> <small style={{ color: '#64748b' }}>(Defined Route)</small>
                                </div>
                            </div>
                        </li>
                    ))}

                    {suggestions.map((suggestion) => (
                        <li
                            key={suggestion.id}
                            className={styles.suggestionItem}
                            onClick={() => handleSuggestionClick(suggestion.display_name)}
                        >
                            <div className={styles.suggestionLeft}>
                                <FaMapMarkerAlt className={styles.suggestionIcon} />
                                <div className={styles.suggestionText} title={suggestion.display_name}>
                                    {suggestion.display_name}
                                </div>
                            </div>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(suggestion.display_name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.mapLink}
                                onClick={(e) => e.stopPropagation()}
                            >
                                Map
                            </a>
                        </li>
                    ))}

                    {filteredLocal.length === 0 && suggestions.length === 0 && !isLoading && inputValue.length >= 3 && (
                        <li className={styles.noResults}>No matches found</li>
                    )}
                </ul>
            )}
        </div>
    );
}

export default LocationAutocomplete;
