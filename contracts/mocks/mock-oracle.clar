;; mock-oracle (test + prototype price source)
;; Implements oracle-trait with an owner-set price per underlying label. In tests
;; this stands in for a DEX-TWAP or USD-feed-derived adapter; production swaps in
;; a real derivation without touching covault-settler.
(impl-trait .oracle-trait.oracle-trait)

(define-constant ERR-NOT-OWNER (err u300))
(define-constant ERR-NO-PRICE (err u301))

(define-data-var contract-owner principal tx-sender)
(define-map prices (string-ascii 16) uint)

;; #[allow(unchecked_data)]
(define-public (set-price (label (string-ascii 16)) (price uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
    (ok (map-set prices label price))))

(define-read-only (get-price (label (string-ascii 16)))
  (ok (unwrap! (map-get? prices label) ERR-NO-PRICE)))
