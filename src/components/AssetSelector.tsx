import React, { useState, useMemo, Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { Asset, BTC_ASSET } from '@/types/common';
import styles from './AppInterface.module.css'; // Use correct CSS module

interface AssetSelectorProps {
  value: Asset | null;
  onChange: (asset: Asset) => void;
  disabled: boolean;
  purpose: 'selectRune' | 'selectBtcOrRune';
  otherAsset: Asset | null; // Asset selected in the *other* input/output
  availableAssets: Asset[];
  isPopularLoading: boolean;
  popularError: string | null;
}

export function AssetSelector({ 
    value, 
    onChange, 
    disabled, 
    purpose, 
    otherAsset, 
    availableAssets, 
    isPopularLoading, 
    popularError 
}: AssetSelectorProps) {
    const [internalSearchQuery, setInternalSearchQuery] = useState('');

    const options = useMemo(() => {
        const query = internalSearchQuery.toLowerCase();
        let results = [...availableAssets];
        if (purpose === 'selectBtcOrRune') {
            // Ensure BTC is an option if needed
            if (!results.some(a => a.isBTC)) results.unshift(BTC_ASSET);
        } else {
            // Filter out BTC if only Runes are allowed
            results = results.filter(a => !a.isBTC);
        }
        // Filter by search query
        if (query) results = results.filter(a => a.name?.toLowerCase().includes(query) || a.id?.toLowerCase().includes(query));
        // Filter out the asset selected in the other input/output field
        if (otherAsset) results = results.filter(a => a.id !== otherAsset.id);
        return results;
    }, [internalSearchQuery, availableAssets, purpose, otherAsset]);

    const displaySelectedValue = (selected: Asset | null) => {
        if (!selected) return <span className={styles.placeholder}>Select Token</span>;
        const ticker = selected.isBTC ? 'BTC' : (selected.name.split('•')[0] || selected.name);
        return (
            <span className={styles.selectedToken}>
                {selected.imageURI && (
                  <Image 
                    src={selected.imageURI} 
                    alt={ticker} 
                    className={styles.tokenIcon} 
                    width={20}
                    height={20}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target) {
                        target.style.display = 'none';
                      }
                    }}
                  />
                )} {ticker}
            </span>
        );
    };

    // Find the full asset object corresponding to the current value ID to ensure Listbox gets the correct object reference
    const currentValueObject = value ? availableAssets.concat(BTC_ASSET).find(opt => opt.id === value.id) || value : null;

    return (
        <Listbox value={currentValueObject} onChange={onChange} disabled={disabled}>
            <div className={styles.listBoxContainer}>
                <Listbox.Button className={styles.listboxButton}>
                    {displaySelectedValue(currentValueObject)}
                    <span className={styles.listboxButtonIconContainer}>
                        <ChevronUpDownIcon className={styles.listboxButtonIcon} aria-hidden="true" />
                    </span>
                </Listbox.Button>
                <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Listbox.Options className={styles.listBoxOptions}>
                        <div className={styles.searchContainer}>
                            <input 
                                type="text" 
                                placeholder="Search name or ID" 
                                value={internalSearchQuery} 
                                onChange={e => setInternalSearchQuery(e.target.value)} 
                                className={styles.searchInput} 
                                autoComplete="off" 
                            />
                        </div>
                        {isPopularLoading && !internalSearchQuery && options.length === 0 ? (
                            <div className={styles.loadingOrError}>Loading...</div>
                        ) : popularError && options.length === 0 ? (
                            <div className={styles.loadingOrError}>{popularError}</div>
                        ) : options.length === 0 ? (
                            <div className={styles.noResults}>{internalSearchQuery ? 'No match' : 'No assets'}</div>
                        ) : (
                            <div className={styles.optionsScroll}>
                                {options.map((asset) => (
                                    <Listbox.Option key={asset.id} className={({ active }) => `${styles.listboxOption} ${active ? styles.listboxOptionActive : styles.listboxOptionInactive}`} value={asset}>
                                        {({ selected }) => {
                                            const ticker = asset.isBTC ? 'BTC' : (asset.name.split('•')[0] || asset.name);
                                            return (
                                                <>
                                                    <span className={`${styles.optionContent} ${selected ? styles.listboxOptionTextSelected : styles.listboxOptionTextUnselected}`}>
                                                        {asset.imageURI && (
                                                          <Image 
                                                            src={asset.imageURI} 
                                                            alt={ticker} 
                                                            className={styles.tokenIcon} 
                                                            width={20}
                                                            height={20}
                                                            onError={(e) => {
                                                              const target = e.target as HTMLImageElement;
                                                              if (target) {
                                                                target.style.display = 'none';
                                                              }
                                                            }}
                                                          />
                                                        )}
                                                        <span className={styles.optionTicker}>{ticker}</span>
                                                        {!asset.isBTC && <span className={styles.optionName}>({asset.name})</span>}
                                                    </span>
                                                    {selected && <span className={styles.checkIconContainer}><CheckIcon className={styles.checkIcon} aria-hidden="true" /></span>}
                                                </>
                                            );
                                        }}
                                    </Listbox.Option>
                                ))}
                            </div>
                        )}
                    </Listbox.Options>
                </Transition>
            </div>
        </Listbox>
    );
} 