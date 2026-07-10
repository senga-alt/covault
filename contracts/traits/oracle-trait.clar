;; oracle-trait
;; A price source for settlement. get-price returns the settlement price for a
;; series' underlying label, denominated in that series' collateral asset units
;; (e.g. sats-per-STX for a sBTC-collateralized STX-SBTC series). Producing a
;; collateral-denominated price is the source's job - that is what keeps
;; Covault settlement free of the quanto (cross-currency) problem.
(define-trait oracle-trait
  (
    (get-price ((string-ascii 16)) (response uint uint))
  )
)
